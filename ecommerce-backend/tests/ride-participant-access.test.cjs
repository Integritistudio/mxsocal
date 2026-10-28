const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
function controller() {
  const participant = { id: "11111111-1111-4111-8111-111111111111", requestId: "ride", riderIndex: 1, paidAt: null, lastLinkSentAt: null };
  const request = { id: "ride", userId: "owner", status: "pending_payment" };
  const sent = [], fulfilled = [];
  const fail = (message, status = 409) => { const e = new Error(message); e.status = status; throw e; };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../controllers/ride-participant.controller.js"), "utf8"), { module, exports: module.exports, process: { env: { STRIPE_RIDE_WEBHOOK_SECRET: "whsec_test" } }, require: name => {
    if (name.includes("ride-participant.model")) return { findByPk: async () => participant };
    if (name.includes("ride-request.model")) return { findByPk: async () => request };
    if (name.includes("auth.middleware")) return (req, res, next) => req.user ? next() : res.status(401).json({});
    if (name.includes("ride-participant-links")) return { valid: (_, token) => token === "valid-personal-token" };
    if (name.includes("ride-request-validation")) return { uuid: value => /^[a-f0-9-]{36}$/.test(value) };
    if (name.includes("ride-request-email")) return { queueParticipant: async p => sent.push(p.id) };
    if (name.includes("ride-participant-checkout")) return { fail, locked: async (_, callback) => callback(request, participant, {}), ensureOpen: r => { if (r.status !== "pending_payment") fail("Closed"); }, fulfill: async session => fulfilled.push(session), stripe: () => ({ webhooks: { constructEvent: (body, signature) => { if (signature !== "verified") throw Error("Bad signature"); return body; } } }) };
    throw Error(name);
  } });
  const response = () => ({ code: 200, payload: null, status(code) { this.code = code; return this; }, json(payload) { this.payload = payload; return this; } });
  const req = (user = { id: "owner", role: "user" }) => ({ params: { id: participant.id }, headers: {}, user });
  return { ...module.exports, participant, request, sent, fulfilled, response, req };
}
test("owner session accesses their own rider only; buddies need a valid personal link", async () => {
  const c = controller(); let calls = 0;
  const res = c.response(); await c.access(c.req(), res, () => calls++); assert.equal(res.code, 403);
  c.participant.riderIndex = 0; await c.access(c.req(), c.response(), () => calls++); assert.equal(calls, 1);
  await c.access(c.req({ id: "other", role: "user" }), c.response(), () => calls++); assert.equal(calls, 1);
  c.participant.riderIndex = 1; const buddy = c.req(null); buddy.headers["x-ride-token"] = "valid-personal-token";
  await c.access(buddy, c.response(), () => calls++); assert.equal(calls, 2);
  buddy.headers["x-ride-token"] = "invalid"; const invalid = c.response(); await c.access(buddy, invalid, () => calls++); assert.equal(invalid.code, 403); assert.equal(calls, 2);
});
test("only owner or booking-update staff can resend; resends enforce cooldown and payment state", async () => {
  const c = controller();
  let res = c.response(); await c.resend(c.req({ id: "other", role: "user" }), res); assert.equal(res.code, 403); assert.equal(c.sent.length, 0);
  await c.resend(c.req(), c.response()); assert.equal(c.sent.length, 1);
  c.participant.riderIndex = 0; res = c.response(); await c.resend(c.req(), res); assert.equal(res.code, 403);
  await c.resend(c.req({ id: "admin", role: "admin" }), c.response()); assert.equal(c.sent.length, 2);
  await c.resend(c.req({ id: "staff", role: "manager", permissions: ["booking:update"] }), c.response()); assert.equal(c.sent.length, 3);
  c.participant.lastLinkSentAt = new Date(); res = c.response(); await c.resend(c.req({ id: "admin", role: "admin" }), res); assert.equal(res.code, 429);
  c.participant.lastLinkSentAt = null; c.participant.paidAt = new Date(); res = c.response(); await c.resend(c.req({ id: "admin", role: "admin" }), res); assert.equal(res.code, 409);
});
test("only verified Stripe events with rider metadata reach fulfillment", async () => {
  const c = controller(); const body = { type: "checkout.session.completed", data: { object: { metadata: { rideParticipantId: "rider" } } } };
  let res = c.response(); await c.webhook({ body, headers: {} }, res); assert.equal(res.code, 400); assert.equal(c.fulfilled.length, 0);
  await c.webhook({ body, headers: { "stripe-signature": "verified" } }, c.response()); assert.equal(c.fulfilled.length, 1);
  await c.webhook({ body: { ...body, data: { object: { metadata: { bookingId: "rental" } } } }, headers: { "stripe-signature": "verified" } }, c.response()); assert.equal(c.fulfilled.length, 1);
});
