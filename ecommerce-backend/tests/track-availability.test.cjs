const test = require("node:test");
const assert = require("node:assert/strict");
const { currentMonth, currentDate, availabilityMonths, validateDays } = require("../lib/track-availability");
test("two-month window handles year rollover and Pacific dates", () => {
  assert.deepEqual(availabilityMonths(new Date("2026-12-15T12:00:00Z")), ["2026-12", "2027-01"]);
  assert.deepEqual(availabilityMonths(new Date("2026-11-01T06:59:00Z")), ["2026-10", "2026-11"]);
  assert.equal(currentDate(new Date("2026-11-01T06:59:00Z")), "2026-10-31");
  assert.equal(currentDate(new Date("2026-11-01T07:00:00Z")), "2026-11-01");
});
test("calendar rolls over at the venue's Pacific midnight", () => {
  assert.equal(currentMonth(new Date("2026-11-01T06:59:00Z")), "2026-10");
  assert.equal(currentMonth(new Date("2026-11-01T07:00:00Z")), "2026-11");
});
test("track availability accepts explicitly published days and empty months", () => {
  assert.equal(validateDays("2026-10", {}), true);
  assert.equal(validateDays("2026-10", { "2026-10-24": { status: "available", note: "9 am–2 pm" }, "2026-10-25": { status: "unavailable", note: "Private event" } }), true);
});
test("rejects dates outside the month, impossible dates, malformed entries and long notes", () => {
  const entry = { status: "available", note: "" };
  for (const days of [{ "2026-11-01": entry }, { "2026-10-00": entry }, { "2026-10-32": entry }, { "2026-10-24": { ...entry, status: "open" } }, { "2026-10-24": { ...entry, note: "x".repeat(301) } }, { "2026-10-24": null }, []]) assert.equal(validateDays("2026-10", days), false);
  assert.equal(validateDays("2026-02", { "2026-02-29": entry }), false);
  assert.equal(validateDays("2028-02", { "2028-02-29": entry }), true);
});
