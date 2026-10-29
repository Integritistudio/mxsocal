const { Op } = require("sequelize");
const sequelize = require("../config/database");
const { Product, HelmetSpec, GloveSpec, SuitSpec } = require("../models/product.model");
const { Booking, BookingAccessory } = require("../models/booking.model");
const resources = require("../lib/resource-availability");
const mail = require("../lib/booking-email");
const Coach = require("../models/coach.model");
const { fail, minutes, validateSlots, overlap, priceCents, validateDate } = require("../lib/rental-pricing");
const stripe = () => {
  if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) { const error = new Error("Stripe test checkout is not configured."); error.status = 503; throw error; }
  return require("stripe")(process.env.STRIPE_SECRET_KEY, { timeout: 10000, maxNetworkRetries: 1 });
};
const sendError = (res, error) => res.status(error.status || 503).json({ message: error.status ? error.message : "Unable to complete checkout. Please try again." });
const publicFields = ["id", "name", "slug", "category", "images", "pricePerDay", "currency", "attributes", "stockQuantity"];
const specs = [{ model: HelmetSpec, as: "helmetSpec" }, { model: GloveSpec, as: "gloveSpec" }, { model: SuitSpec, as: "suitSpec" }];

// A pending Checkout Session owns its slot until Stripe confirms it has expired.
// This also reconciles payments if a webhook or the success redirect was missed.
async function activeRows(rows, transaction) {
  const active = [];
  for (const row of rows) {
    if (row.status === "pending" && row.paymentStatus !== "paid" && row.meta?.source === "rental-checkout") {
      const holdExpired = Date.parse(row.meta.holdUntil) <= Date.now();
      if (holdExpired) {
        await releaseBooking(row, transaction);
        await row.reload({ transaction });
        if (row.status === "cancelled") continue;
      } else if (row.meta.stripeSessionId) {
        const session = await stripe().checkout.sessions.retrieve(row.meta.stripeSessionId);
        if (session.payment_status === "paid") await fulfill(session, transaction);
        else if (session.status === "expired") { await row.update({ status: "cancelled" }, { transaction }); continue; }
      }
    }
    active.push(row);
  }
  return active;
}

async function quote(body, transaction) {
  const date = validateDate(body.bookingDate);
  const slots = validateSlots(body.slots);
  if (!Array.isArray(body.accessories || []) || (body.accessories || []).length > 10) fail("Choose up to 10 accessories.");
  const selections = body.accessories || [];
  const ids = [body.productId, ...selections.map(item => item?.productId)];
  if (ids.some(id => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) || new Set(ids).size !== ids.length) fail("Choose valid, distinct products.");
  // Lock in stable order so simultaneous customers cannot reserve the same inventory.
  const products = await Product.findAll({ where: { id: ids }, order: [["id", "ASC"]], transaction, ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) });
  if (products.length !== ids.length || products.some(p => !p.available || p.status !== "available")) fail("One of your products is unavailable.");
  const bike = products.find(p => p.id === body.productId);
  if (bike.category !== "bike") fail("Choose a bike for your booking.");
  if (products.some(p => p.currency !== bike.currency)) fail("Products must use the same currency.");
  if (bike.currency !== "USD") fail("Online rental checkout currently supports USD products.");
  const quantity = body.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) fail("Choose a valid bike quantity.");
  const reservations = await activeRows(await Booking.findAll({ where: { bookingDate: date, status: { [Op.notIn]: ["cancelled", "completed"] } }, include: [{ model: BookingAccessory, as: "accessoryItems" }], transaction }), transaction);
  const localNow = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  if (slots.some(slot => `${date} ${slot.start}` <= localNow)) fail("Choose a future time slot (Pacific time).");
  for (const product of products) {
    const requestedQuantity = product.id === bike.id ? quantity : (selections.find(item => item.productId === product.id)?.quantity ?? 1);
    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > 10000) fail("Choose a valid product quantity.");
    if (product.id !== bike.id && requestedQuantity > quantity) fail("Gear quantity cannot exceed the number of bikes in your booking.");
    if (!resources.covers(await resources.windows("product", product.id, date, transaction), slots)) fail(product.name + " is not available during the selected hours.");
    const reserved = reservations.map(row => ({ slots: row.slots, quantity: row.productId === product.id ? (row.meta?.quantity || 1) : (row.accessoryItems || []).filter(item => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0) })).filter(row => row.quantity > 0);
    const left = resources.remaining(product.stockQuantity, reserved, slots);
    if (left < requestedQuantity) { const error = new Error(product.name + ": only " + left + " available for your selected time. Please adjust your booking."); error.status = 409; throw error; }
  }
  const hours = slots.reduce((sum, s) => sum + (minutes(s.end) - minutes(s.start)) / 60, 0);
  const items = [{ productId: bike.id, name: bike.name, quantity, unitAmount: priceCents(bike, hours) }];
  for (const selection of selections) {
    const product = products.find(p => p.id === selection.productId);
    if (product.category === "bike") fail("Choose gear accessories, not another bike listing.");
    const Model = { helmet: HelmetSpec, gloves: GloveSpec, suit: SuitSpec }[product.category];
    const spec = Model ? await Model.findOne({ where: { productId: product.id }, transaction }) : null;
    const sizes = spec?.sizes || product.attributes?.sizes || [];
    if (sizes.length && !sizes.includes(selection.size)) fail(`Choose a valid size for ${product.name}.`);
    items.push({ productId: product.id, name: product.name, quantity: selection.quantity ?? 1, size: sizes.length ? selection.size : null, unitAmount: priceCents(product, hours) });
  }
  let coach = null;
  if (body.coachId) {
    if (typeof body.coachId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.coachId)) fail("Choose a valid coach.");
    const selected = await Coach.findByPk(body.coachId, { transaction, ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) });
    if (!selected || selected.hourlyRate == null || Number(selected.hourlyRate) <= 0) fail("This coach is unavailable for online booking.");
    if (!resources.covers(await resources.windows("coach", selected.id, date, transaction), slots)) fail("This coach is unavailable during your selected hours.");
    // Re-read after the coach lock: another bike's checkout may have reserved this coach while we waited.
    const bookings = await activeRows(await Booking.findAll({ where: { bookingDate: date, status: { [Op.notIn]: ["cancelled", "completed"] }, meta: { [Op.contains]: { coachId: selected.id } } }, transaction }), transaction);
    if (bookings.some(booking => overlap(booking.slots, slots))) { const error = new Error("This coach is already reserved at that time."); error.status = 409; throw error; }
    coach = { id: selected.id, name: `${selected.firstName} ${selected.lastName}`, specialty: selected.specialty, image: selected.profileImage, hourlyRate: selected.hourlyRate };
    items.push({ coachId: selected.id, name: `${coach.name} — coaching (${hours} ${hours === 1 ? "hour" : "hours"})`, quantity: 1, unitAmount: priceCents({ name: coach.name, pricePerDay: Number(selected.hourlyRate) * hours }) });
  }
  const totalAmount = items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0);
  if (!Number.isSafeInteger(totalAmount) || totalAmount < 50 || totalAmount > 99999999) fail("This booking total cannot be processed.");
  return { productId: bike.id, quantity, bookingDate: date, slots, durationHours: hours, currency: bike.currency.toLowerCase(), items, coach, totalAmount, timeZone: "America/Los_Angeles" };
}

exports.catalog = async (_req, res) => {
  try { res.json({ products: await Product.findAll({ where: { available: true, status: "available" }, attributes: publicFields, include: specs, order: [["createdAt", "ASC"]] }), coaches: await Coach.findAll({ attributes: ["id", "firstName", "lastName", "bio", "specialty", "hourlyRate", "profileImage", "imagePresentation"], where: { hourlyRate: { [Op.gt]: 0 } }, order: [["displayOrder", "ASC"]] }), timeZone: "America/Los_Angeles" }); }
  catch (error) { sendError(res, error); }
};
exports.mine = async (req, res) => {
  try {
    const period = req.query.period || "upcoming";
    if (!["upcoming", "past"].includes(period)) fail("Choose upcoming or past bookings.");
    let rows = await Booking.findAll({ where: { userId: req.user.id }, include: [{ model: Product, attributes: ["id", "name", "slug", "images"] }, { model: BookingAccessory, as: "accessoryItems", include: [{ model: Product, as: "product", attributes: ["name", "images"] }] }], order: [["bookingDate", "ASC"], ["createdAt", "ASC"]] });
    await activeRows(rows.filter(row => row.status === "pending" && row.paymentStatus !== "paid"));
    rows = await Promise.all(rows.map(row => row.reload()));
    const now = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
    const bookings = rows.filter(row => {
      if (row.meta?.source === "ride-request") return false;
      const end = (row.slots || []).map(slot => slot.end).sort().pop() || "23:59";
      const past = ["cancelled", "completed"].includes(row.status) || `${row.bookingDate} ${end}` <= now;
      return period === "past" ? past : !past;
    }).map(row => ({ id: row.id, quantity: row.meta?.quantity || 1, bookingDate: row.bookingDate, slots: row.slots, status: row.status, paymentStatus: row.paymentStatus, totalPrice: row.totalPrice, currency: row.meta?.currency || "USD", product: row.Product ? { id: row.Product.id, name: row.Product.name, slug: row.Product.slug, image: row.Product.images?.[0] } : null, accessories: (row.accessoryItems || []).map(item => ({ name: item.product?.name || "Rental gear", size: item.size, quantity: item.quantity })), coach: row.meta?.coach ? { name: row.meta.coach.name, specialty: row.meta.coach.specialty } : null, notes: row.notes }));
    if (period === "past") bookings.reverse();
    res.json({ bookings, period, timeZone: "America/Los_Angeles" });
  } catch (error) { sendError(res, error); }
};
exports.availability = async (req, res) => {
  try {
    const date = validateDate(req.query.date);
    if (!/^[0-9a-f-]{36}$/i.test(req.params.productId)) fail("Choose a valid product.");
    const product = await Product.findByPk(req.params.productId);
    if (!product || !product.available || product.status !== "available") fail("This product is unavailable.");
    const rows = await activeRows(await Booking.findAll({ where: { bookingDate: date, status: { [Op.notIn]: ["cancelled", "completed"] } }, include: [{ model: BookingAccessory, as: "accessoryItems" }] }));
    const reserved = rows.map(row => ({ slots: row.slots, quantity: row.productId === product.id ? row.meta?.quantity || 1 : (row.accessoryItems || []).filter(item => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0) })).filter(row => row.quantity);
    res.json({ date, timeZone: "America/Los_Angeles", slots: resources.choices(await resources.windows("product", product.id, date)).map(slot => { const remaining = resources.remaining(product.stockQuantity, reserved, [slot]); return { ...slot, remaining, available: remaining > 0 }; }) });
  } catch (error) { sendError(res, error); }
};
exports.quote = async (req, res) => { try { res.json(await quote(req.body)); } catch (error) { sendError(res, error); } };
exports.checkout = async (req, res) => {
  let booking;
  try {
    const client = stripe();
    const origin = new URL(process.env.FRONTEND_URL || "http://localhost:3000").origin;
    await sequelize.transaction(async transaction => {
      const result = await quote(req.body, transaction);
      if (req.body.notes != null && (typeof req.body.notes !== "string" || req.body.notes.length > 2000)) fail("Notes must be under 2,000 characters.");
      const accessories = result.items.filter(item => item.productId && item.productId !== result.productId);
      booking = await Booking.create({ userId: req.user.id, productId: result.productId, bookingDate: result.bookingDate, slots: result.slots, durationHours: Number.isInteger(result.durationHours) ? result.durationHours : null, totalPrice: result.totalAmount / 100, accessories, notes: req.body.notes || null, meta: { source: "rental-checkout", currency: result.currency, totalAmount: result.totalAmount, items: result.items, coachId: result.coach?.id || null, coach: result.coach, quantity: result.quantity, holdUntil: new Date(Date.now() + 5 * 60000).toISOString() } }, { transaction });
      await BookingAccessory.bulkCreate(accessories.map(item => ({ bookingId: booking.id, productId: item.productId, quantity: item.quantity, size: item.size, price: item.unitAmount / 100 })), { transaction });
    });
    const stripeParams = { mode: "payment", ui_mode: "embedded", redirect_on_completion: "if_required", payment_method_types: ["card"], customer_email: req.account.email, client_reference_id: booking.id, metadata: { bookingId: booking.id }, return_url: origin + "/booking/success?session_id={CHECKOUT_SESSION_ID}", line_items: booking.meta.items.map(item => ({ quantity: item.quantity, price_data: { currency: booking.meta.currency, unit_amount: item.unitAmount, product_data: { name: item.name + (item.size ? " (" + item.size + ")" : "") } } })) };
    await booking.update({ meta: { ...booking.meta, stripeParams } });
    await booking.reload();
    if (booking.status !== "pending" || Date.parse(booking.meta.holdUntil) <= Date.now()) {
      await releaseBooking(booking);
      const error = new Error("Your checkout hold expired. Review availability and try again."); error.status = 410; throw error;
    }
    const session = await client.checkout.sessions.create(stripeParams, { idempotencyKey: "booking-" + booking.id });
    await booking.update({ meta: { ...booking.meta, stripeSessionId: session.id } });
    res.status(201).json({ bookingId: booking.id, sessionId: session.id, url: origin + "/booking/checkout?session_id=" + session.id, holdUntil: booking.meta.holdUntil });
  } catch (error) {
    // Keep an uncertain Stripe request reserved; the hold reconciles or expires safely.
    sendError(res, error);
  }
};
async function fulfill(session, transaction) {
  if (session.payment_status !== "paid") return;
  const booking = await Booking.findByPk(session.metadata?.bookingId, { transaction });
  if (!booking || booking.meta?.source !== "rental-checkout" || session.client_reference_id !== booking.id || (booking.meta.stripeSessionId && booking.meta.stripeSessionId !== session.id) || session.amount_total !== booking.meta.totalAmount || session.currency !== booking.meta.currency || session.livemode) throw new Error("Payment does not match this booking.");
  await booking.update({ paymentStatus: "paid", status: booking.paymentStatus === "paid" ? booking.status : "confirmed", meta: { ...booking.meta, stripeSessionId: session.id, paymentIntentId: session.payment_intent } }, { transaction });
  await mail.queue(booking.id, transaction);
}
exports.session = async (req, res) => {
  try {
    if (!/^cs_test_[A-Za-z0-9]+$/.test(req.params.sessionId)) fail("Invalid checkout session.");
    const session = await stripe().checkout.sessions.retrieve(req.params.sessionId);
    const booking = session.metadata?.bookingId && await Booking.findByPk(session.metadata.bookingId);
    if (!booking || booking.userId !== req.user.id) return res.status(404).json({ message: "Booking not found." });
    await fulfill(session);
    if (booking.paymentStatus !== "paid" && Date.parse(booking.meta.holdUntil) <= Date.now()) await releaseBooking(booking);
    await booking.reload();
    res.json({ bookingId: booking.id, status: booking.status, paymentStatus: booking.paymentStatus, bookingDate: booking.bookingDate, slots: booking.slots, totalPrice: booking.totalPrice, currency: booking.meta.currency, items: booking.meta.items });
  } catch (error) { sendError(res, error); }
};
exports.webhook = async (req, res) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).json({ message: "Stripe webhook is not configured." });
  let event;
  try { event = stripe().webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET); }
  catch { return res.status(400).json({ message: "Invalid Stripe signature." }); }
  try {
    if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) await fulfill(event.data.object);
    res.json({ received: true });
  } catch (error) { sendError(res, error); }
};

async function releaseBooking(booking, transaction) {
  await booking.reload({ transaction });
  if (booking.paymentStatus === "paid" || booking.status === "cancelled") return;
  let id = booking.meta?.stripeSessionId;
  if (!id && booking.meta?.stripeParams) {
    const recovered = await stripe().checkout.sessions.create(booking.meta.stripeParams, { idempotencyKey: `booking-${booking.id}` });
    id = recovered.id;
    await booking.update({ meta: { ...booking.meta, stripeSessionId: id } }, { transaction });
  }
  if (id) {
    let session = await stripe().checkout.sessions.retrieve(id);
    if (session.payment_status === "paid") { await fulfill(session, transaction); return; }
    if (session.status === "open") {
      try { session = await stripe().checkout.sessions.expire(id); }
      catch { session = await stripe().checkout.sessions.retrieve(id); }
    }
    if (session.payment_status === "paid") { await fulfill(session, transaction); return; }
    // Never free inventory until Stripe can no longer accept this payment.
    if (session.status !== "expired") return;
  }
  await booking.update({ status: "cancelled", meta: { ...booking.meta, releasedAt: new Date().toISOString() } }, { transaction });
}
exports.release = async (req, res) => {
  try {
    const booking = await Booking.findOne({ where: { userId: req.user.id, meta: { [Op.contains]: { stripeSessionId: req.params.sessionId } } } });
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    await releaseBooking(booking);
    await booking.reload();
    res.json({ status: booking.status, paymentStatus: booking.paymentStatus, released: booking.status === "cancelled", productId: booking.productId });
  } catch (error) { sendError(res, error); }
};
exports.embeddedSession = async (req, res) => {
  try {
    const booking = await Booking.findOne({ where: { userId: req.user.id, meta: { [Op.contains]: { stripeSessionId: req.params.sessionId } } } });
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (Date.parse(booking.meta.holdUntil) <= Date.now()) await releaseBooking(booking);
    const session = await stripe().checkout.sessions.retrieve(req.params.sessionId);
    await fulfill(session); await booking.reload();
    res.json({ clientSecret: session.status === "open" && booking.status === "pending" ? session.client_secret : null, publishableKey: process.env.STRIPE_PUBLISHABLE_KEY, holdUntil: booking.meta.holdUntil, productId: booking.productId, status: booking.status, paymentStatus: booking.paymentStatus });
  } catch (error) { sendError(res, error); }
};
let workerRunning = false;
exports.runMaintenance = async (sendMail = true) => {
  if (workerRunning) return;
  workerRunning = true;
  try {
    const rows = await Booking.findAll({ where: { status: "pending", paymentStatus: "pending", meta: { [Op.contains]: { source: "rental-checkout" } } }, limit: 200, order: [["createdAt", "ASC"]] });
    for (const booking of rows) if (Date.parse(booking.meta?.holdUntil) <= Date.now()) { try { await releaseBooking(booking); } catch { /* Keep reserved and retry when Stripe responds. */ } }
    if (sendMail) await mail.deliver();
  } finally { workerRunning = false; }
};
