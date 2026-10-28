const { fail } = require("./rental-pricing");
const { currentDate, availabilityMonths } = require("./track-availability");
const uuid = value => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function rideDates(start, end, now = new Date()) {
  const valid = date => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
  if (!valid(start) || !valid(end) || start <= currentDate(now) || !availabilityMonths(now).includes(end.slice(0, 7)) || end <= start) fail("Choose at least two consecutive days starting tomorrow or later, within this month and next month.");
  const count = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  if (count > 62) fail("Choose a ride of no more than 62 days.");
  return Array.from({ length: count }, (_, i) => new Date(Date.parse(`${start}T12:00:00Z`) + i * 86400000).toISOString().slice(0, 10));
}
function normalizeDraft(body, account) {
  if (!body || (body.trackId && !uuid(body.trackId)) || !Array.isArray(body.riders) || body.riders.length < 1 || body.riders.length > 4) fail("Choose up to three buddies and a valid track, or skip track selection.");
  const dates = rideDates(body.startDate, body.endDate);
  const coachMode = body.coachMode || "group";
  if (!["group", "individual"].includes(coachMode)) fail("Choose group or individual coaching.");
  const riders = body.riders.map((rider, i) => {
    if (!rider || !uuid(rider.bikeId) || !Array.isArray(rider.gear) || rider.gear.length > 12) fail("Choose a bike and valid gear for every rider.");
    const contact = i === 0 ? { name: account.name, email: account.email, phone: account.phone || "" } : rider;
    if (i && (typeof contact.name !== "string" || contact.name.trim().length < 2 || contact.name.length > 100 || typeof contact.email !== "string" || contact.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) || typeof contact.phone !== "string" || !/^\+?[\d\s().-]{7,25}$/.test(contact.phone))) fail("Enter each buddy's name, email and phone number.");
    let buddyDetails = {};
    if (i) {
      const age = typeof rider.age === "string" ? rider.age.trim() : rider.age;
      if (!["string", "number"].includes(typeof age) || !/^\d+(?:\.0+)?$/.test(String(age)) || Number(age) < 1 || Number(age) > 120) fail("Enter each buddy's age between 1 and 120 years.");
      const measurements = require("./profile-measurements").measurements(rider);
      if (measurements.error || measurements.data.heightCm == null || measurements.data.weightKg == null) fail("Enter each buddy's height in cm (30-300) and weight in kg (1-500), with at most one decimal place.");
      buddyDetails = { age: Number(age), ...measurements.data };
    }
    const gear = rider.gear.map(item => { if (!item || !uuid(item.productId) || typeof item.size !== "string" || item.size.length > 30) fail("Choose valid gear and sizes."); return { productId: item.productId, size: item.size }; });
    if (new Set(gear.map(item => item.productId)).size !== gear.length) fail("Choose each gear item only once per rider.");
    return { name: contact.name.trim(), email: contact.email.trim().toLowerCase(), phone: contact.phone.trim(), bikeId: rider.bikeId, coachId: coachMode === "individual" ? rider.coachId || null : null, ...buddyDetails, gear };
  });
  if (body.coachId && !uuid(body.coachId)) fail("Choose a valid coach.");
  if (riders.some(rider => rider.coachId && !uuid(rider.coachId))) fail("Choose a valid coach for each rider.");
  const individualCoaches = riders.map(rider => rider.coachId).filter(Boolean);
  if (coachMode === "individual" && new Set(individualCoaches).size !== individualCoaches.length) fail("Please select a different coach for each rider, or choose one coach for the whole group.");
  const selected = coachMode === "group" ? !!body.coachId : riders.some(rider => rider.coachId);
  if ((account.needsCoach !== false || riders.length > 1) && !selected) fail("You require a coach in order to book. Please select one.");
  if (coachMode === "individual" && account.needsCoach !== false && !riders[0].coachId) fail("You require a coach in order to book. Please select one for yourself.");
  if (body.notes !== undefined && (typeof body.notes !== "string" || body.notes.length > 2000)) fail("Keep booking notes under 2,000 characters.");
  return { trackId: body.trackId || null, startDate: dates[0], endDate: dates.at(-1), riders, coachMode, coachId: coachMode === "group" ? body.coachId || null : null, notes: body.notes?.trim() || "" };
}
function dailyCents(value, name) {
  if (value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) < 0) fail(`${name} needs a daily rental rate. Please contact us.`);
  const cents = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(cents) || cents > 99999999) fail("Daily rental price is invalid.");
  return cents;
}
module.exports = { uuid, rideDates, normalizeDraft, dailyCents };
