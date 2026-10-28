const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { splitAmounts, riderItems } = require("../lib/ride-participant-pricing");
const terms = require("../lib/ride-waiver-terms");
function fixture(individual = false) {
  return { id: "request", userId: "owner", status: "pending_payment", startDate: "2099-11-17", endDate: "2099-11-18",
    draft: { coachMode: individual ? "individual" : "group", coachId: individual ? null : "group-coach", riders: [{ name: "Owner", email: "owner@example.com", coachId: individual ? "coach-0" : null, age: 30 }, { name: "Buddy", email: "buddy@example.com", coachId: individual ? "coach-1" : null, age: 25 }] },
    estimate: { totalAmount: 90000, items: [{ riderIndex: 0, name: "Owner bike", amount: 20000 }, { riderIndex: 1, name: "Buddy bike", amount: 30000 }, { riderIndex: 1, name: "Gear package", amount: 10000 }, { riderIndex: 1, name: "Included helmet", amount: 0, included: true }, ...(individual ? [{ coachId: "coach-0", name: "Owner coach", amount: 10000 }, { coachId: "coach-1", name: "Buddy coach", amount: 20000 }] : [{ coachId: "group-coach", name: "Group coach", amount: 30000 }])] } };
}
function harness() {
  const request = fixture(); request.update = async values => Object.assign(request, values);
  const amounts = splitAmounts(request);
  const riders = amounts.map((amountCents, i) => ({ id: `rider-${i}`, requestId: request.id, riderIndex: i, name: request.draft.riders[i].name, email: request.draft.riders[i].email, amountCents, currency: "usd", checkoutAttempt: 0, signedAt: null, paidAt: null, stripeSessionId: null, async update(values) { Object.assign(this, values); }, async save() {}, changed() {} }));
  const sessions = new Map(), keys = [], bookingUpdates = [];
  let creates = 0, tail = Promise.resolve();
  const transaction = { LOCK: { UPDATE: "UPDATE" } };
  const db = { transaction: callback => { const job = tail.then(() => callback(transaction)); tail = job.catch(() => {}); return job; } };
  const stripe = { checkout: { sessions: {
    create: async (params, options) => {
      keys.push(options.idempotencyKey);
      const existing = [...sessions.values()].find(s => s.key === options.idempotencyKey);
      if (existing) return existing;
      creates++;
      const session = { id: `cs_test_${creates}`, status: "open", payment_status: "unpaid", url: "https://checkout.stripe.com/test", amount_total: params.line_items[0].price_data.unit_amount, currency: "usd", livemode: false, metadata: params.metadata, client_reference_id: params.client_reference_id, key: options.idempotencyKey };
      sessions.set(session.id, session); return session;
    },
    retrieve: async id => sessions.get(id),
    expire: async id => { const session = sessions.get(id); session.status = "expired"; return session; },
  } } };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../lib/ride-participant-checkout.js"), "utf8"), { module, exports: module.exports, console, process: { env: { STRIPE_SECRET_KEY: "sk_test_fake" } }, require: name => {
    if (name === "sequelize") return require("sequelize");
    if (name === "stripe") return () => stripe;
    if (name.includes("config/database")) return db;
    if (name.includes("ride-request.model")) return { findByPk: async () => request };
    if (name.includes("ride-participant.model")) return { findByPk: async id => riders.find(r => r.id === id), findAll: async () => riders };
    if (name.includes("booking.model")) return { Booking: { update: async values => bookingUpdates.push(values) } };
    if (name === "./ride-participant-links") return { url: p => `https://mxsocal.test/ride/complete/${p.id}#token=test` };
    return require(path.resolve(__dirname, "../lib", name));
  } });
  return { ...module.exports, request, riders, sessions, keys, bookingUpdates, creates: () => creates };
}
const signature = (overrides = {}) => ({ signature: "Legal Rider Name", signerRole: "self", adultConfirmed: true, accepted: true, version: terms.version, ...overrides });
test("group coach is entirely on owner; individual coaches belong to assigned riders", () => {
  assert.deepEqual(splitAmounts(fixture()), [50000, 40000]);
  assert.deepEqual(splitAmounts(fixture(true)), [30000, 60000]);
  assert.ok(!riderItems(fixture(), 1).some(item => item.coachId));
  const bad = fixture(); bad.estimate.totalAmount++;
  assert.throws(() => splitAmounts(bad), /do not match/);
});
test("waiver is required before checkout and stores an immutable terms snapshot", async () => {
  const h = harness();
  await assert.rejects(() => h.checkout("rider-0"), /Sign your liability waiver/);
  await assert.rejects(() => h.sign("rider-0", signature({ version: "old" }), {}), /current terms/);
  await h.sign("rider-0", signature(), { ip: "127.0.0.1" });
  assert.equal(h.riders[0].waiver.version, terms.version);
  assert.equal(h.riders[0].waiver.sections.length, terms.sections.length);
  assert.equal(h.riders[0].waiver.signature, "Legal Rider Name");
  await h.sign("rider-0", signature({ signature: "Changed" }), {});
  assert.equal(h.riders[0].waiver.signature, "Legal Rider Name");
});
test("minors require an adult guardian signature", async () => {
  const h = harness(); h.request.draft.riders[1].age = 16;
  await assert.rejects(() => h.sign("rider-1", signature(), {}), /parent or legal guardian/);
  await h.sign("rider-1", signature({ signerRole: "guardian" }), {});
  assert.equal(h.riders[1].waiver.signerRole, "guardian");
});
test("all riders must sign and pay; concurrent duplicate webhooks confirm exactly once", async () => {
  const h = harness();
  await h.sign("rider-0", signature(), {});
  await h.checkout("rider-0");
  const first = [...h.sessions.values()][0]; first.payment_status = "paid"; first.status = "complete";
  await h.fulfill(first);
  assert.equal(h.request.status, "pending_payment");
  assert.equal(h.bookingUpdates.length, 0);
  await h.sign("rider-1", signature(), {}); await h.checkout("rider-1");
  const second = [...h.sessions.values()][1]; second.payment_status = "paid"; second.status = "complete";
  await Promise.all([h.fulfill(second), h.fulfill(second), h.fulfill(first)]);
  assert.equal(h.request.status, "approved");
  assert.equal(h.bookingUpdates.length, 1);
  assert.equal(h.bookingUpdates[0].paymentStatus, "paid");
});
test("wrong totals, currency, live mode, metadata, and unsigned payments cannot fulfill", async () => {
  const h = harness(); await h.sign("rider-0", signature(), {}); await h.checkout("rider-0");
  const session = [...h.sessions.values()][0]; session.payment_status = "paid";
  for (const values of [{ amount_total: 1 }, { currency: "eur" }, { livemode: true }, { client_reference_id: "other" }, { metadata: { ...session.metadata, rideRequestId: "other" } }, { metadata: { ...session.metadata, checkoutAttempt: "9" } }]) await assert.rejects(() => h.fulfill({ ...session, ...values }), /does not match/);
  h.riders[0].signedAt = null;
  await assert.rejects(() => h.fulfill(session), /does not match/);
  assert.equal(h.riders[0].paidAt, null);
});
test("retries reuse checkout; expired sessions create one new attempt", async () => {
  const h = harness(); await h.sign("rider-0", signature(), {});
  await Promise.all([h.checkout("rider-0"), h.checkout("rider-0")]);
  assert.equal(h.creates(), 1);
  [...h.sessions.values()][0].status = "expired";
  await h.checkout("rider-0"); assert.equal(h.creates(), 2);
  assert.equal(h.riders[0].checkoutAttempt, 1);
});
test("lost DB response recovers Stripe session, including cancellation safety", async () => {
  const h = harness(); await h.sign("rider-0", signature(), {}); await h.checkout("rider-0");
  h.riders[0].stripeSessionId = null;
  await h.checkout("rider-0"); assert.equal(h.creates(), 1);
  h.riders[0].stripeSessionId = null;
  await h.cancel(h.request, {});
  assert.equal([...h.sessions.values()][0].status, "expired");
});
test("paid or processing cancellation cannot silently release inventory", async () => {
  const h = harness(); await h.sign("rider-0", signature(), {}); await h.checkout("rider-0");
  const session = [...h.sessions.values()][0]; session.payment_status = "paid"; session.status = "complete";
  await assert.rejects(() => h.cancel(h.request, {}), /payment has been received/);
  await h.fulfill(session);
  await assert.rejects(() => h.cancel(h.request, {}), /Arrange refunds/);
});
test("closed and past rides reject payment", async () => {
  const h = harness(); h.request.status = "cancelled";
  await assert.rejects(() => h.sign("rider-0", signature(), {}), /not awaiting payment/);
  h.request.status = "pending_payment"; h.request.startDate = "2000-01-01";
  await assert.rejects(() => h.checkout("rider-0"), /first ride day has passed/);
});
test("zero-charge rider still signs but does not need a Stripe charge", async () => {
  const h = harness(); h.riders[1].amountCents = 0;
  await h.sign("rider-1", signature(), {});
  assert.ok(h.riders[1].signedAt); assert.ok(h.riders[1].paidAt);
  assert.equal(h.creates(), 0);
});
test("personal link tokens bind to participant and request", () => {
  const links = require("../lib/ride-participant-links");
  const previous = process.env.RIDE_LINK_SECRET;
  process.env.RIDE_LINK_SECRET = "test-secret-for-personal-ride-links-only";
  try {
    const rider = { id: "first", requestId: "request" }, token = links.token(rider);
    assert.ok(links.valid(rider, token));
    assert.equal(links.valid({ ...rider, id: "second" }, token), false);
    assert.equal(links.valid({ ...rider, requestId: "other" }, token), false);
    assert.equal(links.valid(rider, "bad"), false);
    assert.ok(links.url(rider).includes("#token="));
  } finally { if (previous === undefined) delete process.env.RIDE_LINK_SECRET; else process.env.RIDE_LINK_SECRET = previous; }
});
