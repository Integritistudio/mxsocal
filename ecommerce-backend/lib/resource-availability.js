const { Op } = require("sequelize");
const Availability = require("../models/resource-availability.model");
const { ProductAvailability } = require("../models/product.model");
const { fail, minutes } = require("./rental-pricing");
const endMinutes = value => value === "24:00" ? 1440 : minutes(value);
function windowsValid(slots) {
  if (!Array.isArray(slots) || slots.length > 24) return false;
  try {
    const sorted = slots.map(slot => ({ start: minutes(slot.start), end: endMinutes(slot.end) })).sort((a, b) => a.start - b.start);
    return sorted.every((slot, i) => slot.end > slot.start && (!i || slot.start >= sorted[i - 1].end));
  } catch { return false; }
}
async function windows(type, id, date, transaction) {
  const month = date.slice(0, 7);
  const rows = await Availability.findAll({ where: { resourceType: type, resourceId: id, month: { [Op.lte]: month } }, order: [["month", "DESC"]], transaction });
  const rule = rows.find(row => row.month === month && !row.repeatMonthly) || rows.find(row => row.repeatMonthly);
  if (rule) return rule.days[String(Number(date.slice(8)))] ?? [{ start: "00:00", end: "24:00" }];
  // Explicit legacy schedules are honored. Missing schedules mean available 24/7.
  if (type === "product") {
    const exact = await ProductAvailability.findAll({ where: { productId: id, date, isRecurring: false }, transaction });
    const legacy = exact.length ? exact : await ProductAvailability.findAll({ where: { productId: id, weekday: new Date(`${date}T12:00:00Z`).getUTCDay(), isRecurring: true }, transaction });
    if (legacy.length) return legacy.flatMap(row => row.slots || []);
  }
  return [{ start: "00:00", end: "24:00" }];
}
function covers(windows, slots) { return slots.every(slot => windows.some(window => minutes(slot.start) >= minutes(window.start) && endMinutes(slot.end) <= endMinutes(window.end))); }
function choices(windows) {
  const time = n => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  return windows.flatMap(window => {
    const slots = []; let start = minutes(window.start); const end = endMinutes(window.end);
    while (start < end) { const next = Math.min(start + 60, end); slots.push({ start: time(start), end: time(next) }); start = next; }
    return slots;
  });
}
function remaining(capacity, reservations, requested) {
  let peak = 0;
  for (const slot of requested) {
    const events = [];
    for (const reservation of reservations) for (const taken of reservation.slots) {
      const start = Math.max(minutes(slot.start), minutes(taken.start)); const end = Math.min(endMinutes(slot.end), endMinutes(taken.end));
      if (start < end) { events.push([start, reservation.quantity], [end, -reservation.quantity]); }
    }
    events.sort((a, b) => a[0] - b[0] || a[1] - b[1]); let count = 0;
    for (const [, change] of events) { count += change; peak = Math.max(peak, count); }
  }
  return Math.max(0, capacity - peak);
}
function validateMonthBody(body) {
  if (!body || !/^\d{4}-(0[1-9]|1[0-2])$/.test(body.month) || typeof body.repeatMonthly !== "boolean" || !body.days || typeof body.days !== "object" || Array.isArray(body.days)) fail("Choose a month, recurrence and daily hours.");
  if (Object.keys(body.days).some(day => !/^(?:[1-9]|[12]\d|3[01])$/.test(day) || !windowsValid(body.days[day]))) fail("Check the daily hours. Use 00:00–24:00 for a full day, or close the day.");
}
module.exports = { windows, covers, choices, remaining, endMinutes, windowsValid, validateMonthBody };
