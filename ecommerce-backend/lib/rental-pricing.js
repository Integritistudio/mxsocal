const fail = message => { const error = new Error(message); error.status = 400; throw error; };
function minutes(value) {
  if (value === "24:00") return 1440;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || "")) fail("Choose a valid time slot.");
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}
function validateSlots(slots) {
  if (!Array.isArray(slots) || !slots.length || slots.length > 48) fail("Choose between one and 48 time slots.");
  const normalized = slots.map(slot => {
    if (!slot || slot.start === "24:00" || minutes(slot.end) <= minutes(slot.start)) fail("Time slots must end after they start.");
    return { start: slot.start, end: slot.end };
  }).sort((a, b) => minutes(a.start) - minutes(b.start));
  for (let i = 1; i < normalized.length; i++) if (minutes(normalized[i].start) < minutes(normalized[i - 1].end)) fail("Time slots cannot overlap.");
  return normalized;
}
const overlap = (a, b) => a.some(x => b.some(y => minutes(x.start) < minutes(y.end) && minutes(y.start) < minutes(x.end)));
function priceCents(product) {
  const amount = Number(product.pricePerDay);
  if (product.pricePerDay == null || !Number.isFinite(amount) || amount <= 0) fail(`${product.name} does not have a rental price.`);
  return Math.round(amount * 100);
}
function validateDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) fail("Choose a valid booking date.");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (date < today || Date.parse(date) > Date.now() + 366 * 86400000) fail("Choose a booking date within the next year.");
  return date;
}
module.exports = { fail, minutes, validateSlots, overlap, priceCents, validateDate };
