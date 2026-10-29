const test = require("node:test");
const assert = require("node:assert/strict");
const { summarizeRides } = require("../lib/ride-dashboard");
const today = "2026-10-29";
const request = (id, status = "pending_payment", overrides = {}) => ({ id, status, startDate: "2026-11-02", endDate: "2026-11-04", riderCount: 2, estimatedCents: 150000, ...overrides });
const rider = (requestId, amountCents, paid = false, signed = paid) => ({ requestId, amountCents, paidAt: paid ? "2026-10-29T00:00:00Z" : null, signedAt: signed ? "2026-10-28T23:00:00Z" : null });
test("requested estimates are separate from collected revenue and unpaid accepted balances", () => {
  const data = summarizeRides([request("new", "requested"), request("rejected", "rejected"), request("expired", "requested", { startDate: "2026-10-28" })], [], today);
  assert.equal(data.pendingRequests, 1); assert.equal(data.requestedCents, 150000);
  assert.equal(data.collectedCents, 0); assert.equal(data.outstandingCents, 0); assert.equal(data.upcoming.length, 0);
});
test("individual payments count immediately even while a group is partially paid", () => {
  const data = summarizeRides([request("partial")], [rider("partial", 109500, true), rider("partial", 40500)], today);
  assert.equal(data.collectedCents, 109500); assert.equal(data.outstandingCents, 40500);
  assert.equal(data.partiallyPaidRequests, 1); assert.equal(data.pendingPaymentRequests, 1);
  assert.equal(data.unpaidRiders, 1); assert.equal(data.waiversPending, 1); assert.equal(data.paidRiders, 1);
  assert.equal(data.approvedRequests, 0); assert.equal(data.upcoming.length, 0);
});
test("three days and two riders still count as one confirmed group", () => {
  const data = summarizeRides([request("ready", "approved")], [rider("ready", 109500, true), rider("ready", 40500, true)], today);
  assert.equal(data.collectedCents, 150000); assert.equal(data.approvedRequests, 1); assert.equal(data.upcoming.length, 1);
  assert.equal(data.outstandingCents, 0); assert.equal(data.upcoming[0].amountPaidCents, 150000);
});
test("approved legacy estimates cannot masquerade as confirmed paid rides", () => {
  for (const participants of [[], [rider("old", 150000, true)], [rider("old", 109500, true), rider("old", 40500, true, false)]]) {
    const data = summarizeRides([request("old", "approved")], participants, today);
    assert.equal(data.approvedRequests, 0); assert.equal(data.upcoming.length, 0);
  }
});
test("today includes ongoing rides through the end date and separates completed groups", () => {
  const requests = [request("current", "approved", { startDate: "2026-10-27", endDate: today }), request("past", "approved", { startDate: "2026-10-26", endDate: "2026-10-28" })];
  const participants = requests.flatMap(r => [rider(r.id, 109500, true), rider(r.id, 40500, true)]);
  const data = summarizeRides(requests, participants, today);
  assert.equal(data.todaysRides, 1); assert.equal(data.completedRides, 1); assert.equal(data.upcoming.length, 1);
  assert.equal(data.collectedCents, 300000);
});
test("accepted requests without participant records still expose their outstanding balance", () => {
  const data = summarizeRides([request("missing")], [], today);
  assert.equal(data.outstandingCents, 150000); assert.equal(data.unpaidRiders, 2); assert.equal(data.waiversPending, 2);
  assert.equal(data.partiallyPaidRequests, 0);
});
test("zero-cost riders can complete without inflating revenue and unpaid closed requests add no balance", () => {
  const data = summarizeRides([request("free", "approved", { estimatedCents: 0 }), request("cancelled", "cancelled")], [rider("free", 0, true), rider("free", 0, true), rider("cancelled", 150000)], today);
  assert.equal(data.collectedCents, 0); assert.equal(data.approvedRequests, 1); assert.equal(data.outstandingCents, 0);
});
test("dashboard endpoint combines real rider payments and legacy rentals without double-counting inventory rows", async () => {
  const vm = require("node:vm"), fs = require("node:fs"), path = require("node:path"), { Op } = require("sequelize");
  const routes = {}, calls = [], transactions = [];
  const router = { use() {}, get: (url, ...handlers) => routes[url] = handlers.at(-1), patch() {}, post() {}, put() {} };
  const requests = [request("partial")], participants = [rider("partial", 109500, true), rider("partial", 40500)];
  const sequelize = { literal: sql => ({ sql }), transaction: async (options, callback) => { transactions.push(options); return callback({ snapshot: true }); } };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../routes/operations.route.js"), "utf8"), { module, exports: module.exports, console, require: name => {
    if (name === "express") return { Router: () => router };
    if (name === "sequelize") return { Op };
    if (name.includes("config/database")) return sequelize;
    if (name.includes("ride-request.model")) return { findAll: async options => { assert.ok(options.raw); assert.ok(options.transaction); return requests; } };
    if (name.includes("ride-participant.model")) return { findAll: async options => { assert.equal(options.where.currency, "usd"); return participants; } };
    if (name.includes("booking.model")) return { Booking: { sum: async (field, options) => { calls.push(options); return "50.25"; }, count: async () => 1 } };
    if (name.includes("product.model")) return { Product: { findAll: async () => [] } };
    if (name.includes("coach.model")) return { count: async () => 2 };
    if (name.includes("ride-request-email.model")) return { count: async () => 3 };
    if (name.includes("booking-email.model")) return { count: async () => 2 };
    if (name.includes("track-availability")) return { currentDate: () => today };
    if (name.includes("ride-dashboard")) return { summarizeRides };
    if (name.includes("resource-availability")) return { validateMonthBody() {} };
    return {};
  } });
  const res = { body: null, code: 200, set() { return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  await routes["/overview"]({ user: { role: "manager", permissions: ["dashboard:view"] } }, res);
  assert.equal(res.code, 200); assert.equal(res.body.revenue, 1145.25); assert.equal(res.body.outstandingCents, 40500);
  assert.equal(res.body.pendingEmails, 5); assert.equal(res.body.upcomingRequests.length, 0);
  assert.equal(transactions[0].isolationLevel, "REPEATABLE READ");
  assert.equal(calls[0].where.paymentStatus, "paid"); assert.ok(calls[0].where[Op.and][0].sql.includes("<> 'ride-request'"));
});
