const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateSlots, overlap, priceCents, validateDate } = require("../lib/rental-pricing");
test("rejects malformed, reversed, and overlapping reservation times", () => {
  for (const slots of [[], [{ start: "24:00", end: "25:00" }], [{ start: "15:00", end: "12:00" }], [{ start: "12:00", end: "15:00" }, { start: "14:00", end: "16:00" }]]) assert.throws(() => validateSlots(slots));
});
test("adjacent reservations are allowed, intersecting reservations are blocked", () => {
  const booked = [{ start: "12:00", end: "15:00" }];
  assert.equal(overlap(booked, [{ start: "15:00", end: "18:00" }]), false);
  assert.equal(overlap(booked, [{ start: "14:59", end: "18:00" }]), true);
});
test("charges database hourly rates by duration and daily rates once", () => {
  assert.equal(priceCents({ name: "Bike", pricePerHour: "12.50", pricePerDay: "100" }, 3), 3750);
  assert.equal(priceCents({ name: "Bike", pricePerHour: null, pricePerDay: "120" }, 6), 12000);
  assert.throws(() => priceCents({ name: "Bike", pricePerDay: null }, 3));
  assert.throws(() => priceCents({ name: "Bike", pricePerDay: "-1" }, 3));
});
test("rejects impossible and past dates", () => {
  assert.throws(() => validateDate("2027-02-30"));
  assert.throws(() => validateDate("2000-01-01"));
  assert.throws(() => validateDate("not-a-date"));
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  assert.equal(validateDate(tomorrow), tomorrow);
});
