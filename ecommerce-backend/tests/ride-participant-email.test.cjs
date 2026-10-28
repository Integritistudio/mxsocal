const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
function worker() {
  const request = { id: "ride", status: "pending_payment" };
  const participant = { id: "rider", requestId: "ride", riderIndex: 1, email: "buddy@example.com", paidAt: null, async update(values) { Object.assign(this, values); } };
  const jobs = [], deliveries = [], transaction = { LOCK: { UPDATE: "UPDATE" } }, transport = { offline: false };
  const model = {
    findOrCreate: async options => {
      let job = jobs.find(j => j.kind === options.where.kind && j.riderIndex === options.where.riderIndex);
      if (!job) { job = { ...options.where, ...options.defaults, sentAt: null, attempts: 0, lockedUntil: null, async update(values) { Object.assign(this, values); }, async reload() {} }; jobs.push(job); }
      return [job];
    },
    findAll: async () => jobs.filter(j => !j.sentAt),
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../lib/ride-request-email.js"), "utf8"), { module, exports: module.exports, console, process: { env: {} }, require: name => {
    if (name === "sequelize") return require("sequelize");
    if (name.includes("config/database")) return { transaction: callback => callback(transaction) };
    if (name.includes("ride-request-email.model")) return model;
    if (name.includes("ride-request.model")) return { findByPk: async () => request };
    if (name.includes("ride-participant.model")) return { findOne: async () => participant };
    if (name.includes("ride-participant-email-template")) return { participantEmail: (r, p) => ({ subject: "Sign and pay", text: `${r.id}:${p.id}`, html: "Personal link" }), paymentReceiptEmail: (r, p, url) => ({ subject: "Payment received", text: `${r.id}:${p.id}:${url}`, html: "View your ride details" }) };
    if (name.includes("ride-participant-checkout")) return { receiptUrl: async () => "https://pay.stripe.com/receipts/buddy" };
    if (name.includes("ride-request-rejection-email")) return require("../lib/ride-request-rejection-email");
    if (name.includes("account-mail")) return { sendAccountMail: async email => { if (transport.offline) throw Error("Mail unavailable"); deliveries.push(email); } };
    throw Error(name);
  } });
  return { ...module.exports, request, participant, jobs, deliveries, transaction, transport };
}
test("review email queue is idempotent and resend requeues the rider's personal email", async () => {
  const w = worker(); await w.queueParticipant(w.participant, w.transaction); await w.queueParticipant(w.participant, w.transaction);
  assert.equal(w.jobs.length, 1); assert.ok(w.participant.lastLinkSentAt);
  await w.deliver(); assert.equal(w.deliveries.length, 1); assert.equal(w.deliveries[0].email, "buddy@example.com");
  await w.queueParticipant(w.participant, w.transaction, true); await w.deliver(); assert.equal(w.deliveries.length, 2); assert.equal(w.jobs.length, 1);
});
test("queued personal links are not sent for paid riders or closed requests", async () => {
  for (const close of [false, true]) {
    const w = worker(); await w.queueParticipant(w.participant, w.transaction);
    if (close) w.request.status = "cancelled"; else w.participant.paidAt = new Date();
    await w.deliver(); assert.equal(w.deliveries.length, 0); assert.ok(w.jobs[0].sentAt);
  }
});
test("an in-flight delivery cannot be overwritten by a resend", async () => {
  const w = worker(); await w.queueParticipant(w.participant, w.transaction);
  w.jobs[0].lockedUntil = new Date(Date.now() + 60000);
  await assert.rejects(() => w.queueParticipant(w.participant, w.transaction, true), /already being sent/);
});
test("payment receipt is queued once and emailed only to its paid rider", async () => {
  const w = worker(); w.participant.paidAt = new Date();
  await w.queuePaymentReceipt(w.participant, w.transaction); await w.queuePaymentReceipt(w.participant, w.transaction);
  assert.equal(w.jobs.length, 1); assert.equal(w.jobs[0].kind, "paid");
  await w.deliver(); await w.deliver();
  assert.equal(w.deliveries.length, 1); assert.equal(w.deliveries[0].email, "buddy@example.com");
  assert.ok(w.deliveries[0].text.includes("https://pay.stripe.com/receipts/buddy"));
});
test("unpaid riders never get a payment receipt", async () => {
  const w = worker(); await w.queuePaymentReceipt(w.participant, w.transaction);
  await w.deliver(); assert.equal(w.deliveries.length, 0); assert.equal(w.jobs[0].sentAt, null);
});
test("buddy confirmation contains personal booking link and selections without other riders' private details", () => {
  const { paymentReceiptEmail } = require("../lib/ride-participant-email-template");
  const previous = process.env.RIDE_LINK_SECRET;
  process.env.RIDE_LINK_SECRET = "test-secret-for-receipt-email-template-only";
  try {
    const request = { id: "group-reference", status: "pending_payment", startDate: "2026-11-02", endDate: "2026-11-04", draft: { coachMode: "individual", riders: [{ name: "Private owner", coachId: "coach-owner" }, { name: "Buddy", coachId: "coach-buddy" }] }, estimate: { track: { name: "Lake Elsinore Raceway" }, items: [{ riderIndex: 0, name: "Private owner's bike", amount: 10000 }, { riderIndex: 1, name: "Buddy Honda", amount: 40500 }, { coachId: "coach-owner", name: "Private owner's coach", amount: 10000 }, { coachId: "coach-buddy", name: "Buddy coach", amount: 0 }] } };
    const participant = { id: "buddy-id", requestId: request.id, riderIndex: 1, name: "<Buddy>", amountCents: 40500, currency: "usd" };
    const mail = paymentReceiptEmail(request, participant, "https://pay.stripe.com/receipts/buddy");
    for (const content of [mail.text, mail.html]) {
      assert.ok(content.includes("Buddy Honda")); assert.ok(content.includes("Buddy coach")); assert.ok(content.includes("$405.00"));
      assert.ok(content.includes("/ride/complete/buddy-id#token=")); assert.ok(content.includes("https://pay.stripe.com/receipts/buddy"));
      assert.ok(!content.includes("Private owner's"));
    }
    assert.ok(!mail.html.includes("<Buddy>")); assert.ok(mail.html.includes("&lt;Buddy&gt;"));
  } finally { if (previous === undefined) delete process.env.RIDE_LINK_SECRET; else process.env.RIDE_LINK_SECRET = previous; }
});
function rejectedRequest(w, expired = false) {
  Object.assign(w.request, { status: "rejected", startDate: "2026-11-02", endDate: "2026-11-04", expiredAt: expired ? new Date() : null, adminNote: "Track closed <script>unsafe</script>", draft: { riders: [{ name: "Owner", email: "owner@example.com" }, { name: "Buddy", email: "buddy@example.com" }] }, estimate: { track: { name: "Fox Raceway" } } });
}
test("rejection queues one email per rider and includes escaped reason and reference", async () => {
  const w = worker(); rejectedRequest(w);
  await w.queueRejection(w.request, w.transaction); await w.queueRejection(w.request, w.transaction);
  assert.equal(w.jobs.length, 2);
  await w.deliver(); await w.deliver();
  assert.deepEqual(w.deliveries.map(mail => mail.email), ["owner@example.com", "buddy@example.com"]);
  for (const mail of w.deliveries) {
    assert.ok(mail.subject.includes("not approved")); assert.ok(mail.text.includes("Reference: ride"));
    assert.ok(mail.html.includes("&lt;script&gt;")); assert.ok(!mail.html.includes("<script>"));
  }
  assert.ok(w.deliveries[0].text.includes("/account?tab=bookings"));
  assert.ok(!w.deliveries[1].text.includes("/account"));
});
test("automatic expiry uses an expired email and failed deliveries remain queued", async () => {
  const w = worker(); rejectedRequest(w, true); await w.queueRejection(w.request, w.transaction);
  w.transport.offline = true; await w.deliver();
  assert.equal(w.deliveries.length, 0); assert.ok(w.jobs.every(job => !job.sentAt && job.nextAttemptAt > new Date()));
  w.transport.offline = false; await w.deliver();
  assert.equal(w.deliveries.length, 2); assert.ok(w.deliveries.every(mail => mail.subject.includes("expired")));
});
