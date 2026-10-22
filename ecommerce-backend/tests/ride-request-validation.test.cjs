const test = require("node:test");
const assert = require("node:assert/strict");
const { rideDates, dailyCents } = require("../lib/ride-request-validation");
const now = new Date("2026-10-22T12:00:00Z");
test("ride dates are inclusive, consecutive and at least two days", () => {
  assert.deepEqual(rideDates("2026-10-23", "2026-10-25", now), ["2026-10-23", "2026-10-24", "2026-10-25"]);
  assert.deepEqual(rideDates("2026-10-31", "2026-11-01", now), ["2026-10-31", "2026-11-01"]);
  for (const [start, end] of [["2026-10-23", "2026-10-23"], ["2026-10-24", "2026-10-23"], ["2026-10-21", "2026-10-23"], ["2026-11-30", "2026-12-01"], ["2026-11-30", "2026-11-31"]]) assert.throws(() => rideDates(start, end, now));
});
test("daily pricing uses integer cents and requires an explicitly configured rate", () => {
  assert.equal(dailyCents("125.50", "Bike"), 12550);
  assert.equal(dailyCents("0.00", "Gear"), 0);
  for (const rate of [null, undefined, -1, "bad", Infinity]) assert.throws(() => dailyCents(rate, "Coach"));
});
