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

test("same-day bookings are rejected and tomorrow remains bookable", () => {
  assert.throws(() => rideDates("2026-10-22", "2026-10-23", now), /starting tomorrow/);
  assert.deepEqual(rideDates("2026-10-23", "2026-10-24", now), ["2026-10-23", "2026-10-24"]);
});

const { normalizeDraft } = require("../lib/ride-request-validation");
const { currentDate } = require("../lib/track-availability");
function buddyDraft(count = 1) {
  const today = currentDate();
  const date = offset => new Date(Date.parse(`${today}T12:00:00Z`) + offset * 86400000).toISOString().slice(0, 10);
  return { coachId: "22222222-2222-4222-8222-222222222222", startDate: date(1), endDate: date(2), riders: Array.from({ length: count + 1 }, () => ({ name: "Buddy Rider", email: "buddy@example.com", phone: "+15551234567", age: "25", heightCm: "175.5", weightKg: "75", bikeId: "11111111-1111-4111-8111-111111111111", gear: [] })) };
}
const account = { name: "Customer", email: "customer@example.com", needsCoach: false };
test("allows three buddies and persists normalized age, height and weight", () => {
  const draft = normalizeDraft(buddyDraft(3), account);
  assert.equal(draft.riders.length, 4);
  assert.equal(draft.riders[1].age, 25);
  assert.equal(draft.riders[1].heightCm, 175.5);
  assert.equal(draft.riders[1].weightKg, 75);
  assert.throws(() => normalizeDraft(buddyDraft(4), account), /three buddies/);
});
test("requires valid buddy age and measurements", () => {
  for (const [key, value] of [["age", ""], ["age", "25.5"], ["age", 121], ["age", true], ["heightCm", undefined], ["heightCm", 301], ["weightKg", ""], ["weightKg", -1]]) {
    const body = buddyDraft(); body.riders[1][key] = value;
    assert.throws(() => normalizeDraft(body, account));
  }
  assert.equal(normalizeDraft(buddyDraft(0), account).riders.length, 1);
});

test("buddies always require a coach even when the account is exempt", () => {
  const body = buddyDraft(); body.coachId = null;
  assert.throws(() => normalizeDraft(body, account), /require a coach/);
  assert.doesNotThrow(() => normalizeDraft({ ...buddyDraft(0), coachId: null }, account));
});
test("individual coach selections survive normalization and enforce primary coaching", () => {
  const body = buddyDraft(); body.coachMode = "individual"; body.coachId = null;
  body.riders[0].coachId = "22222222-2222-4222-8222-222222222222";
  body.riders[1].coachId = "33333333-3333-4333-8333-333333333333";
  const result = normalizeDraft(body, account);
  assert.equal(result.coachMode, "individual"); assert.equal(result.coachId, null);
  assert.equal(result.riders[1].coachId, body.riders[1].coachId);
  body.riders[0].coachId = null;
  assert.doesNotThrow(() => normalizeDraft(body, account));
  assert.throws(() => normalizeDraft(body, { ...account, needsCoach: true }), /for yourself/);
  body.riders[1].coachId = "bad";
  assert.throws(() => normalizeDraft(body, account), /valid coach/);
});
