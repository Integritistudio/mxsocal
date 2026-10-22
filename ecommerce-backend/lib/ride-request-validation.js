const { fail } = require("./rental-pricing");
const { currentDate, availabilityMonths } = require("./track-availability");
const uuid = value => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function rideDates(start, end, now = new Date()) {
  const valid = date => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
  if (!valid(start) || !valid(end) || start < currentDate(now) || !availabilityMonths(now).includes(end.slice(0, 7)) || end <= start) fail("Choose at least two consecutive days within this month and next month.");
  const count = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  if (count > 62) fail("Choose a ride of no more than 62 days.");
  return Array.from({ length: count }, (_, i) => new Date(Date.parse(`${start}T12:00:00Z`) + i * 86400000).toISOString().slice(0, 10));
}
function normalizeDraft(body, account) {
  if (!body || (body.trackId && !uuid(body.trackId)) || !Array.isArray(body.riders) || body.riders.length < 1 || body.riders.length > 21) fail("Choose valid riders and a valid track, or skip track selection.");
  const dates = rideDates(body.startDate, body.endDate);
  const riders = body.riders.map((rider, i) => {
    if (!rider || !uuid(rider.bikeId) || !Array.isArray(rider.gear) || rider.gear.length > 12) fail("Choose a bike and valid gear for every rider.");
    const contact = i === 0 ? { name: account.name, email: account.email, phone: account.phone || "" } : rider;
    if (i && (typeof contact.name !== "string" || contact.name.trim().length < 2 || contact.name.length > 100 || typeof contact.email !== "string" || contact.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) || typeof contact.phone !== "string" || !/^\+?[\d\s().-]{7,25}$/.test(contact.phone))) fail("Enter each buddy's name, email and phone number.");
    const gear = rider.gear.map(item => { if (!item || !uuid(item.productId) || typeof item.size !== "string" || item.size.length > 30) fail("Choose valid gear and sizes."); return { productId: item.productId, size: item.size }; });
    if (new Set(gear.map(item => item.productId)).size !== gear.length) fail("Choose each gear item only once per rider.");
    return { name: contact.name.trim(), email: contact.email.trim().toLowerCase(), phone: contact.phone.trim(), bikeId: rider.bikeId, gear };
  });
  if (account.needsCoach !== false && !uuid(body.coachId)) fail("Your account requires a coach. Choose one for your group.");
  if (body.coachId && !uuid(body.coachId)) fail("Choose a valid coach.");
  if (body.notes !== undefined && (typeof body.notes !== "string" || body.notes.length > 2000)) fail("Keep booking notes under 2,000 characters.");
  return { trackId: body.trackId || null, startDate: dates[0], endDate: dates.at(-1), riders, coachId: body.coachId || null, notes: body.notes?.trim() || "" };
}
function dailyCents(value, name) {
  if (value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) < 0) fail(`${name} needs a daily rental rate. Please contact us.`);
  const cents = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(cents) || cents > 99999999) fail("Daily rental price is invalid.");
  return cents;
}
module.exports = { uuid, rideDates, normalizeDraft, dailyCents };
