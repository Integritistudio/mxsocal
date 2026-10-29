const test = require("node:test");
const assert = require("node:assert/strict");
const { analyticsRange, summarizeAnalytics } = require("../lib/analytics");
const now = new Date("2026-10-29T18:00:00Z");
const range = analyticsRange({ days: 7 }, now);
const empty = () => ({ requests: [], participants: [], bookings: [], customers: [], products: [], coaches: [], contacts: [], signups: [], reviews: [] });
const request = (id, overrides = {}) => ({ id, userId: "organizer", createdAt: "2026-10-25T16:00:00Z", startDate: "2026-11-15", endDate: "2026-11-16", status: "pending_payment", draft: { riders: [{ bikeId: "bike", wantsGear: false }], coachId: "coach" }, estimate: { totalAmount: 50000, items: [{ productId: "bike", amount: 40000 }, { coachId: "coach", amount: 10000 }] }, ...overrides });

test("range uses Pacific calendar days and an equally long previous period", () => {
  assert.equal(range.start, "2026-10-23"); assert.equal(range.end, "2026-10-29");
  assert.equal(range.previousStart, "2026-10-16"); assert.equal(range.previousEnd, "2026-10-22");
  assert.equal(analyticsRange({ days: 7 }, new Date("2026-10-30T01:00:00Z")).end, "2026-10-29");
  const leap = analyticsRange({ start: "2024-02-28", end: "2024-03-01" }, now);
  assert.equal(leap.days, 3); assert.equal(leap.previousEnd, "2024-02-27");
});
test("invalid, reversed, future, and unbounded date ranges are rejected", () => {
  for (const query of [{ days: 1000 }, { start: "2026-02-30", end: "2026-03-01" }, { start: "2026-10-29", end: "2026-10-28" }, { end: "2027-01-01" }, { start: "2020-01-01", end: "2026-10-29" }, { start: ["2026-01-01"] }]) assert.throws(() => analyticsRange(query, now));
});
test("empty database returns zero metrics and a complete zero-filled timeline", () => {
  const result = summarizeAnalytics(empty(), range);
  assert.equal(result.metrics.revenue, 0); assert.equal(result.metrics.approvalRate, 0); assert.equal(result.metrics.averagePayment, 0);
  assert.equal(result.timeline.length, 7); assert.equal(result.timeline[0].date, range.start);
  assert.equal(result.timeline.at(-1).date, range.end); assert.equal(result.heatmap.length, 7);
});
test("revenue counts actual USD payments, excludes holds, and separates the previous period", () => {
  const data = empty();
  data.participants = [
    { requestId: "old-request", amountCents: 12345, currency: "usd", paidAt: "2026-10-25T16:00:00Z" },
    { requestId: "previous", amountCents: 10000, currency: "usd", paidAt: "2026-10-20T16:00:00Z" },
    { amountCents: 900000, currency: "eur", paidAt: "2026-10-25T16:00:00Z" },
    { amountCents: 50000, currency: "usd", paidAt: null },
  ];
  data.bookings = [
    { paymentStatus: "paid", totalPrice: "50.25", updatedAt: "2026-10-25T16:00:00Z", meta: { currency: "USD" } },
    { paymentStatus: "paid", totalPrice: "999.00", updatedAt: "2026-10-25T16:00:00Z", meta: { source: "ride-request" } },
    { paymentStatus: "pending", totalPrice: "200.00", updatedAt: "2026-10-25T16:00:00Z" },
  ];
  const result = summarizeAnalytics(data, range);
  assert.equal(result.metrics.revenue, 173.7); assert.equal(result.previous.revenue, 100);
  assert.equal(result.metrics.payments, 2); assert.equal(result.metrics.averagePayment, 86.85);
  assert.equal(result.timeline.reduce((total, row) => total + row.revenue, 0), 173.7);
});
test("Pacific day boundaries do not leak events into a neighboring period", () => {
  const data = empty(); data.requests = [request("prior", { createdAt: "2026-10-23T06:59:59Z" }), request("current", { createdAt: "2026-10-23T07:00:00Z" }), request("after", { createdAt: "2026-10-30T07:00:00Z" })];
  const result = summarizeAnalytics(data, range);
  assert.equal(result.metrics.requests, 1); assert.equal(result.previous.requests, 1); assert.equal(result.timeline[0].requests, 1);
});
test("rider selections, shared coaching, estimates and operational snapshot are aggregated correctly", () => {
  const data = empty();
  data.products = [{ id: "bike", name: "KTM 300", category: "bike", stockQuantity: 2, available: true, status: "available" }];
  data.coaches = [{ id: "coach", firstName: "Coach", lastName: "One" }];
  data.requests = [request("ride", { draft: { coachId: "coach", riders: [{ bikeId: "bike", wantsGear: true }, { bikeId: "bike", wantsGear: false }] } })];
  data.requests[0].estimate.items.push({ name: "Included helmet", included: true, amount: 99999 });
  const result = summarizeAnalytics(data, range);
  assert.equal(result.metrics.requests, 1); assert.equal(result.metrics.riders, 2);
  assert.deepEqual(result.bikes, [{ label: "KTM 300", value: 2 }]);
  assert.deepEqual(result.coaches, [{ label: "Coach One", value: 1 }]);
  assert.equal(result.estimateMix.reduce((total, row) => total + row.value, 0), 500);
  assert.equal(result.gear[0].value, 1); assert.equal(result.durations[0].value, 1);
  assert.equal(result.details.inventoryUnits, 2); assert.equal(result.heatmap.flatMap(row => row.data).reduce((total, cell) => total + cell.y, 0), 1);
});
test("outstanding cohort balances exclude paid riders and closed requests", () => {
  const data = empty(); data.requests = [request("active"), request("closed", { status: "rejected" })];
  data.participants = [{ requestId: "active", amountCents: 40000 }, { requestId: "active", amountCents: 10000, paidAt: "2026-10-25T16:00:00Z", signedAt: "2026-10-25T15:00:00Z" }, { requestId: "closed", amountCents: 50000 }];
  const result = summarizeAnalytics(data, range);
  assert.equal(result.details.outstanding, 400); assert.equal(result.riderProgress[2].value, 1);
});
test("API response exposes aggregate data without rider identities or contacts", () => {
  const data = empty(); data.requests = [request("private-request", { userId: "private-id", draft: { riders: [{ name: "Private Name", email: "private@example.com", phone: "1234567" }] } })];
  const result = JSON.stringify(summarizeAnalytics(data, range));
  for (const value of ["Private Name", "private@example.com", "1234567", "private-id", "private-request"]) assert.ok(!result.includes(value));
});
test("analytics API requires admin access and validates dates before reading the database", async () => {
  const fs = require("node:fs"), vm = require("node:vm"), path = require("node:path");
  const express = require("express"), supertest = require("supertest");
  const module = { exports: {} }; let reads = 0;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../routes/analytics.route.js"), "utf8"), { module, exports: module.exports, Date, require: name => {
    if (name === "express") return express;
    if (name === "sequelize") return require("sequelize");
    if (name.includes("auth.middleware")) return (req, _res, next) => { req.user = { role: req.headers["x-test-role"] }; next(); };
    if (name.includes("account-access.middleware")) return require("../middleware/account-access.middleware");
    if (name.includes("lib/analytics")) return { analyticsRange: query => analyticsRange(query, now), summarizeAnalytics };
    if (name.includes("config/database")) return { transaction: async () => { reads++; throw Error("offline"); } };
    throw Error(name);
  } });
  const app = express(); app.use("/analytics", module.exports);
  for (const role of ["user", "manager"]) await supertest(app).get("/analytics").set("x-test-role", role).expect(403);
  await supertest(app).get("/analytics?days=9999").set("x-test-role", "admin").expect(400);
  assert.equal(reads, 0);
  const response = await supertest(app).get("/analytics").set("x-test-role", "admin").expect(503);
  assert.equal(reads, 1); assert.equal(response.body.message, "Unable to load analytics. Please try again.");
});
