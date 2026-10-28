const { Op } = require("sequelize");
const Track = require("../models/track.model");
const TrackAvailability = require("../models/track-availability.model");
const ResourceAvailability = require("../models/resource-availability.model");
const { Product, ProductAvailability, HelmetSpec, SuitSpec, GloveSpec } = require("../models/product.model");
const Coach = require("../models/coach.model");
const Pricing = require("../models/ride-pricing.model");
const { Booking, BookingAccessory } = require("../models/booking.model");
const { currentDate, availabilityMonths, trackAvailableForDates } = require("./track-availability");
const { fail } = require("./rental-pricing");
const { rideDates, normalizeDraft, dailyCents } = require("./ride-request-validation");
const specs = [{ model: HelmetSpec, as: "helmetSpec" }, { model: SuitSpec, as: "suitSpec" }, { model: GloveSpec, as: "gloveSpec" }];
async function catalog(start, end, transaction) {
  const dates = start || end ? rideDates(start, end) : [];
  const months = availabilityMonths();
  const tracks = await Track.findAll({ order: [["displayOrder", "ASC"]], transaction });
  const today = currentDate();
  const trackCalendars = await TrackAvailability.findAll({ where: { trackId: tracks.map(track => track.id), month: months }, transaction });
  const publicTracks = tracks.filter(track => trackAvailableForDates(track.id, dates, trackCalendars)).map(t => ({ id: t.id, slug: t.slug, name: t.name, city: t.city, images: t.images || [] }));
  const last = new Date(`${months[1]}-01T12:00:00Z`); last.setUTCMonth(last.getUTCMonth() + 1, 0);
  const lastDate = last.toISOString().slice(0, 10);
  const horizon = Array.from({ length: Math.round((Date.parse(lastDate) - Date.parse(today)) / 86400000) + 1 }, (_, i) => new Date(Date.parse(`${today}T12:00:00Z`) + i * 86400000).toISOString().slice(0, 10)).filter(date => date > today);
  const pricing = await Pricing.findByPk("default", { transaction });
  const gearDailyAmount = pricing?.gearDailyRate == null ? null : dailyCents(pricing.gearDailyRate, "Gear rental");
  const products = await Product.findAll({ where: { available: true, status: "available", [Op.or]: [{ category: { [Op.ne]: "bike" } }, { pricePerDay: { [Op.not]: null } }] }, include: specs, transaction });
  const coaches = await Coach.findAll({ where: { dailyRate: { [Op.not]: null } }, transaction });
  const rules = await ResourceAvailability.findAll({ where: { resourceId: [...products, ...coaches].map(p => p.id), month: { [Op.lte]: months[1] } }, order: [["month", "DESC"]], transaction });
  const legacy = await ProductAvailability.findAll({ where: { productId: products.map(p => p.id), [Op.or]: [{ date: { [Op.between]: [today, lastDate] } }, { isRecurring: true }] }, transaction });
  const bookings = await Booking.findAll({ where: { bookingDate: { [Op.between]: [today, lastDate] }, status: { [Op.in]: ["pending", "confirmed"] } }, include: [{ model: BookingAccessory, as: "accessoryItems" }], transaction });
  const open = (type, id, date) => {
    const candidates = rules.filter(r => r.resourceType === type && r.resourceId === id && r.month <= date.slice(0, 7));
    const rule = candidates.find(r => r.month === date.slice(0, 7) && !r.repeatMonthly) || candidates.find(r => r.repeatMonthly);
    if (rule) return (rule.days[String(Number(date.slice(-2)))] ?? [{ start: "00:00", end: "24:00" }]).length > 0;
    if (type === "coach") return true;
    const exact = legacy.filter(r => r.productId === id && !r.isRecurring && r.date === date);
    const entries = exact.length ? exact : legacy.filter(r => r.productId === id && r.isRecurring && r.weekday === new Date(`${date}T12:00:00Z`).getUTCDay());
    return !entries.length || entries.some(r => r.slots?.length);
  };
  const allProducts = products.map(p => {
    const dailyRemaining = Object.fromEntries(horizon.map(date => [date, Math.max(0, open("product", p.id, date) ? p.stockQuantity - bookings.filter(b => b.bookingDate === date).reduce((sum, b) => sum + (b.productId === p.id ? b.meta?.quantity || 1 : 0) + (b.accessoryItems || []).filter(a => a.productId === p.id).reduce((s, a) => s + a.quantity, 0), 0) : 0)]));
    const remaining = dates.length ? Math.min(...dates.map(date => dailyRemaining[date] || 0)) : Math.max(...Object.values(dailyRemaining));
    return { id: p.id, name: p.name, category: p.category, images: p.images || [], currency: p.currency, pricePerDay: p.pricePerDay, remaining, availableDates: horizon.filter(date => dailyRemaining[date] > 0), group: p.attributes?.rentalGroup || p.category, sizes: p.helmetSpec?.sizes || p.suitSpec?.sizes || p.gloveSpec?.sizes || p.attributes?.sizes || [] };
  });
  const publicCoaches = dates.length ? coaches.filter(c => dates.every(date => open("coach", c.id, date) && !bookings.some(b => b.bookingDate === date && b.meta?.coachId === c.id))).map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, specialty: c.specialty, image: c.profileImage, dailyRate: c.dailyRate })) : [];
  return { tracks: publicTracks, products: allProducts.filter(p => p.remaining > 0), bikes: allProducts.filter(p => p.category === "bike" && p.availableDates.length), coaches: publicCoaches, gearDailyAmount, today, lastDate, dates };
}
async function quote(body, account, transaction) {
  const draft = normalizeDraft(body, account);
  const data = await catalog(draft.startDate, draft.endDate, transaction);
  const track = data.tracks.find(t => t.id === draft.trackId);
  if (draft.trackId && !track) fail("This track is unavailable for your selected dates. Choose another track or skip track selection.");
  const quantities = new Map(); const items = [];
  for (const [index, rider] of draft.riders.entries()) {
    const selections = [{ productId: rider.bikeId, bike: true }, ...rider.gear];
    const groups = new Set();
    for (const selection of selections) {
      const product = data.products.find(p => p.id === selection.productId);
      if (!product || (selection.bike ? product.category !== "bike" : product.category === "bike")) fail("One of your selected bikes or gear items is unavailable for the whole ride.");
      if (product.currency !== "USD") fail("Ride requests currently use USD daily rates.");
      if (!selection.bike && product.sizes.length && !product.sizes.includes(selection.size)) fail(`Choose a valid size for ${product.name}.`);
      if (groups.has(product.group)) fail("Choose only one item from each gear category per rider.");
      groups.add(product.group);
      quantities.set(product.id, (quantities.get(product.id) || 0) + 1);
      if (quantities.get(product.id) > product.remaining) fail(`Not enough ${product.name} available for your group. Please choose another item.`);
      const rate = selection.bike ? dailyCents(product.pricePerDay, product.name) : 0;
      items.push({ riderIndex: index, riderName: rider.name, productId: product.id, name: product.name, size: selection.size || null, image: product.images[0], dailyAmount: rate, days: data.dates.length, amount: rate * data.dates.length, ...(!selection.bike ? { included: true } : {}) });
    }
    if (rider.gear.length) {
      if (data.gearDailyAmount === null) fail("Gear rental is temporarily unavailable. Continue without gear or contact us.");
      items.push({ riderIndex: index, riderName: rider.name, name: "Gear rental", gearPackage: true, dailyAmount: data.gearDailyAmount, days: data.dates.length, amount: data.gearDailyAmount * data.dates.length });
    }
  }
  const coachIds = [...new Set([draft.coachId, ...draft.riders.map(rider => rider.coachId)].filter(Boolean))];
  const selectedCoaches = coachIds.map(id => {
    const selected = data.coaches.find(coach => coach.id === id);
    if (!selected) fail("This coach is unavailable for your whole ride. Choose another coach.");
    const assignmentLabel = draft.coachMode === "individual" ? draft.riders.filter(rider => rider.coachId === id).map(rider => rider.name).join(", ") : "Whole group";
    const rate = dailyCents(selected.dailyRate, selected.name);
    items.push({ name: selected.name, coachId: id, assignmentLabel, image: selected.image, dailyAmount: rate, days: data.dates.length, amount: rate * data.dates.length });
    return { ...selected, assignmentLabel };
  });
  const coach = selectedCoaches[0] || null;
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  if (!Number.isSafeInteger(totalAmount) || totalAmount > 99999999) fail("This estimate is too large. Please contact us.");
  return { draft, estimate: { track: track ? { id: track.id, name: track.name } : null, dates: data.dates, items, coach, coaches: selectedCoaches, totalAmount, currency: "USD", needsCoach: account.needsCoach !== false || draft.riders.length > 1 } };
}
async function lockSelections(draft, transaction) {
  const ids = [...new Set(draft.riders.flatMap(r => [r.bikeId, ...r.gear.map(g => g.productId)]))].sort();
  await Product.findAll({ where: { id: ids }, order: [["id", "ASC"]], transaction, lock: transaction.LOCK.UPDATE });
  const coachIds = [...new Set([draft.coachId, ...draft.riders.map(rider => rider.coachId)].filter(Boolean))].sort();
  if (coachIds.length) await Coach.findAll({ where: { id: coachIds }, order: [["id", "ASC"]], transaction, lock: transaction.LOCK.UPDATE });
}
async function reserve(request, transaction) {
  for (const date of request.estimate.dates) for (const [index, rider] of request.draft.riders.entries()) {
    const assignedCoachId = request.draft.coachMode === "individual" ? rider.coachId : index === 0 ? request.draft.coachId : null;
    const assignedCoach = (request.estimate.coaches || [request.estimate.coach]).find(coach => coach?.id === assignedCoachId);
    const row = await Booking.create({ userId: request.userId, productId: rider.bikeId, bookingDate: date, slots: [{ start: "00:00", end: "24:00" }], durationHours: 24, status: "pending", paymentStatus: "pending", totalPrice: 0, notes: request.draft.notes, meta: { source: "ride-request", requestId: request.id, riderIndex: index, riderName: rider.name, quantity: 1, currency: "USD", ...(assignedCoachId ? { coachId: assignedCoachId, coach: assignedCoach } : {}) } }, { transaction });
    for (const gear of rider.gear) await BookingAccessory.create({ bookingId: row.id, productId: gear.productId, size: gear.size || null, quantity: 1, price: 0 }, { transaction });
  }
}
module.exports = { catalog, quote, lockSelections, reserve };
