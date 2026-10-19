// Exercises the real database, routes and authentication with disposable fixtures.
// Stripe transport is simulated: this script cannot create a charge.
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const assert = require("node:assert/strict");
const { randomUUID, randomBytes } = require("node:crypto");
const realStripe = require("stripe");
const webhooks = realStripe("sk_test_verification").webhooks;
const sessions = new Map();
process.env.STRIPE_SECRET_KEY = "sk_test_verification";
process.env.STRIPE_WEBHOOK_SECRET = `whsec_${randomBytes(24).toString("hex")}`;
require.cache[require.resolve("stripe")].exports = () => ({ webhooks, checkout: { sessions: {
  async create(params) {
    const previous = [...sessions.values()].find(session => session.client_reference_id === params.client_reference_id);
    if (previous) return structuredClone(previous);
    const id = `cs_test_${randomBytes(24).toString("hex")}`;
    const session = { id, client_secret: `${id}_secret_test`, url: `https://checkout.stripe.com/c/pay/${id}`, metadata: params.metadata, client_reference_id: params.client_reference_id, amount_total: params.line_items.reduce((sum, item) => sum + item.quantity * item.price_data.unit_amount, 0), currency: params.line_items[0].price_data.currency, status: "open", payment_status: "unpaid", livemode: false };
    sessions.set(id, session); return structuredClone(session);
  },
  async retrieve(id) { if (!sessions.has(id)) throw new Error("Missing simulated session"); return structuredClone(sessions.get(id)); },
  async expire(id) { const session = sessions.get(id); if (!session || session.status !== "open") throw new Error("Cannot expire"); session.status = "expired"; return structuredClone(session); },
} } });
const express = require("express");
const request = require("supertest");
const sequelize = require("../config/database");
sequelize.options.logging = false;
const User = require("../models/user.model");
const Coach = require("../models/coach.model");
const { Product, ProductAvailability, HelmetSpec, SuitSpec } = require("../models/product.model");
const { Booking, BookingAccessory } = require("../models/booking.model");
const controller = require("../controllers/rental-checkout.controller");
const app = express();
app.post("/rental-checkout/webhook", express.raw({ type: "application/json" }), controller.webhook);
app.use(express.json()); app.use(require("cookie-parser")());
app.use("/rental-checkout", require("../routes/rental-checkout.route"));
app.use("/operations", require("../routes/operations.route"));
const Email = require("../models/booking-email.model");
// Keep the running development server's email worker away from disposable fixtures.
Email.addHook("beforeCreate", "verification-mail-lease", job => { job.lockedUntil = new Date(Date.now() + 3600000); });
const Availability = require("../models/resource-availability.model");
const resources = require("../lib/resource-availability");
const { generateToken } = require("../helpers/jwt");
const productIds = []; const userIds = []; let coach;
const marker = randomUUID();
(async () => {
  try {
    await sequelize.authenticate();
    const user = await User.create({ name: "Booking verification", email: `booking-${marker}@example.invalid`, role: "user", emailVerifiedAt: new Date() }); userIds.push(user.id);
    const other = await User.create({ name: "Other verification", email: `other-${marker}@example.invalid`, role: "user", emailVerifiedAt: new Date() }); userIds.push(other.id);
    const token = generateToken(user.id, "user"); const otherToken = generateToken(other.id, "user");
    const products = [];
    for (const [category, group, price] of [["bike", "bike", 140], ["helmet", "helmet", 5], ["suit", "suit", 5], ["accessory", "boots", 5], ["bike", "bike", 140]]) {
      const product = await Product.create({ name: `Verification ${group} ${marker} ${products.length}`, category, pricePerDay: price, currency: "USD", attributes: { rentalGroup: group, sizes: category === "bike" ? [] : ["S", "M", "L"] } });
      products.push(product); productIds.push(product.id);
    }
    const date = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
    for (const bike of [products[0], products[4]]) await ProductAvailability.create({ productId: bike.id, date, isRecurring: false, slots: [{ start: "09:30", end: "10:30" }, { start: "10:30", end: "11:30" }] });
    await HelmetSpec.create({ productId: products[1].id, sizes: ["S", "M", "L"] });
    await SuitSpec.create({ productId: products[2].id, sizes: ["S", "M", "L"] });
    coach = await Coach.create({ firstName: "Verification", lastName: "Coach", email: `coach-${marker}@example.invalid`, hourlyRate: 5 });
    const payload = { productId: products[0].id, bookingDate: date, slots: [{ start: "09:30", end: "10:30" }], accessories: products.slice(1, 4).map(p => ({ productId: p.id, size: "M", quantity: 1, price: 0 })), coachId: coach.id, totalAmount: 1 };
    const post = (url, body) => request(app).post(`/rental-checkout/${url}`).set("Authorization", `Bearer ${token}`).send(body);
    await request(app).post("/rental-checkout/checkout").send(payload).expect(401);
    const quote = await post("quote", payload).expect(200); assert.equal(quote.body.totalAmount, 16000);
    await post("quote", { ...payload, accessories: [{ productId: products[1].id, size: "M", quantity: 2 }] }).expect(400);
    await post("quote", { ...payload, accessories: [{ productId: products[1].id, size: "XXL" }] }).expect(400);
    await post("quote", { ...payload, slots: [{ start: "02:00", end: "03:00" }] }).expect(400);
    const competing = await Promise.all([post("checkout", payload), post("checkout", payload)]);
    assert.deepEqual(competing.map(r => r.status).sort(), [201, 409]);
    const created = competing.find(r => r.status === 201).body;
    const booking = await Booking.findByPk(created.bookingId);
    assert.equal(Number(booking.totalPrice), 160); assert.equal(booking.meta.coachId, coach.id);
    assert.equal(await BookingAccessory.count({ where: { bookingId: booking.id } }), 3);
    await request(app).get(`/rental-checkout/sessions/${created.sessionId}`).set("Authorization", `Bearer ${otherToken}`).expect(404);
    const unpaid = await request(app).get(`/rental-checkout/sessions/${created.sessionId}`).set("Authorization", `Bearer ${token}`).expect(200);
    assert.equal(unpaid.body.paymentStatus, "pending");
    await post("quote", { ...payload, productId: products[4].id, accessories: [] }).expect(409); // Coach conflict.
    await post("quote", { ...payload, productId: products[4].id, coachId: undefined }).expect(409); // Gear conflict.
    await request(app).post("/rental-checkout/webhook").set("Content-Type", "application/json").send("{}").expect(400);
    const session = sessions.get(created.sessionId); session.payment_status = "paid"; session.status = "complete";
    const webhook = async data => {
      const body = JSON.stringify({ id: `evt_${randomUUID()}`, type: "checkout.session.completed", data: { object: data } });
      const signature = webhooks.generateTestHeaderString({ payload: body, secret: process.env.STRIPE_WEBHOOK_SECRET });
      return request(app).post("/rental-checkout/webhook").set("Content-Type", "application/json").set("stripe-signature", signature).send(body);
    };
    assert.equal((await webhook({ ...session, amount_total: 1 })).status, 503);
    await booking.reload(); assert.equal(booking.paymentStatus, "pending");
    assert.equal((await webhook(session)).status, 200); assert.equal((await webhook(session)).status, 200);
    const paid = await request(app).get(`/rental-checkout/sessions/${created.sessionId}`).set("Authorization", `Bearer ${token}`).expect(200);
    assert.equal(paid.body.paymentStatus, "paid"); assert.equal(paid.body.status, "confirmed");
    const later = { ...payload, slots: [{ start: "10:30", end: "11:30" }] };
    const expiring = await post("checkout", later).expect(201);
    sessions.get(expiring.body.sessionId).status = "expired";
    await post("quote", later).expect(200);
    await request(app).get("/rental-checkout/mine").expect(401);
    const mine = (period, authToken = token) => request(app).get(`/rental-checkout/mine?period=${period}`).set("Authorization", `Bearer ${authToken}`);
    const upcoming = await mine("upcoming").expect(200);
    assert.deepEqual(upcoming.body.bookings.map(row => row.id), [booking.id]);
    assert.equal(upcoming.body.bookings[0].product.name, products[0].name);
    assert.equal(upcoming.body.bookings[0].accessories.length, 3);
    assert.equal(upcoming.body.bookings[0].coach.name, "Verification Coach");
    assert.equal(upcoming.body.bookings[0].meta, undefined);
    assert.equal((await mine("upcoming", otherToken).expect(200)).body.bookings.length, 0);
    await mine("invalid").expect(400);
    const past = await mine("past").expect(200);
    assert.deepEqual(past.body.bookings.map(row => row.id), [expiring.body.bookingId]);
    await booking.update({ bookingDate: "2020-01-01" });
    assert.equal((await mine("upcoming").expect(200)).body.bookings.length, 0);
    assert.ok((await mine("past").expect(200)).body.bookings.some(row => row.id === booking.id));
    // Inventory: two physical units accept two simultaneous reservations, never three.
    await products[0].update({ stockQuantity: 2 });
    const inventoryPayload = { ...payload, accessories: [], coachId: undefined };
    const inventoryAttempts = await Promise.all([post("checkout", inventoryPayload), post("checkout", inventoryPayload), post("checkout", inventoryPayload)]);
    assert.deepEqual(inventoryAttempts.map(r => r.status).sort(), [201, 201, 409]);
    const held = inventoryAttempts.filter(r => r.status === 201).map(r => r.body);
    const release = id => request(app).post(`/rental-checkout/sessions/${id}/release`).set("Authorization", `Bearer ${token}`).send({});
    await request(app).post(`/rental-checkout/sessions/${held[0].sessionId}/release`).set("Authorization", `Bearer ${otherToken}`).send({}).expect(404);
    assert.equal((await release(held[0].sessionId).expect(200)).body.released, true);
    await post("quote", inventoryPayload).expect(200);
    await post("quote", { ...inventoryPayload, quantity: 2 }).expect(409);
    await release(held[1].sessionId).expect(200);
    const two = await post("quote", { ...inventoryPayload, quantity: 2 }).expect(200); assert.equal(two.body.totalAmount, 28000);
    const timed = await post("checkout", { ...inventoryPayload, quantity: 2 }).expect(201);
    const timedBooking = await Booking.findByPk(timed.body.bookingId);
    assert.ok(Date.parse(timedBooking.meta.holdUntil) - Date.now() <= 300000);
    await timedBooking.update({ meta: { ...timedBooking.meta, holdUntil: new Date(Date.now() - 1000).toISOString() } });
    await controller.runMaintenance(false);
    assert.equal(sessions.get(timed.body.sessionId).status, "expired");
    await post("quote", { ...inventoryPayload, quantity: 2 }).expect(200);
    // A returning buyer receives only their own embedded session secret.
    const embedded = await post("checkout", inventoryPayload).expect(201);
    await request(app).get(`/rental-checkout/sessions/${embedded.body.sessionId}/embedded`).set("Authorization", `Bearer ${otherToken}`).expect(404);
    const embeddedDetails = await request(app).get(`/rental-checkout/sessions/${embedded.body.sessionId}/embedded`).set("Authorization", `Bearer ${token}`).expect(200);
    assert.ok(embeddedDetails.body.clientSecret);
    await release(embedded.body.sessionId).expect(200);
    const coachAttempts = await Promise.all([post("checkout", { ...inventoryPayload, slots: later.slots, coachId: coach.id }), post("checkout", { ...inventoryPayload, productId: products[4].id, slots: later.slots, coachId: coach.id })]);
    assert.deepEqual(coachAttempts.map(r => r.status).sort(), [201, 409]);
    await release(coachAttempts.find(r => r.status === 201).body.sessionId).expect(200);
    // Default hours and monthly overrides apply to products and coaches.
    assert.deepEqual(await resources.windows("coach", coach.id, date), [{ start: "00:00", end: "24:00" }]);
    const month = date.slice(0, 7); const day = String(Number(date.slice(8)));
    await Availability.create({ resourceType: "coach", resourceId: coach.id, month, repeatMonthly: true, days: { [day]: [] } });
    const nextMonth = new Date(`${date}T12:00:00Z`); nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    assert.deepEqual(await resources.windows("coach", coach.id, nextMonth.toISOString().slice(0, 10)), []);
    await Availability.create({ resourceType: "coach", resourceId: coach.id, month, repeatMonthly: false, days: { [day]: [{ start: "14:00", end: "15:00" }] } });
    assert.deepEqual(await resources.windows("coach", coach.id, date), [{ start: "14:00", end: "15:00" }]);
    await post("quote", { ...inventoryPayload, coachId: coach.id }).expect(400);
    // Staff permissions protect calendars, customer data, and operations.
    const manager = await User.create({ name: "Verification manager", email: `manager-${marker}@example.invalid`, role: "manager", permissions: ["product:update"], emailVerifiedAt: new Date() }); userIds.push(manager.id);
    const managerToken = generateToken(manager.id, "manager");
    const admin = await User.create({ name: "Verification admin", email: `admin-${marker}@example.invalid`, role: "admin", emailVerifiedAt: new Date() }); userIds.push(admin.id);
    const adminToken = generateToken(admin.id, "admin");
    await request(app).get("/operations/bookings").set("Authorization", `Bearer ${managerToken}`).expect(403);
    const rule = { month, repeatMonthly: true, days: { [day]: [] } };
    await request(app).put(`/operations/availability/product/${products[0].id}`).set("Authorization", `Bearer ${managerToken}`).send(rule).expect(200);
    await request(app).put(`/operations/availability/coach/${coach.id}`).set("Authorization", `Bearer ${managerToken}`).send(rule).expect(403);
    await request(app).put(`/operations/availability/product/${products[0].id}`).set("Authorization", `Bearer ${token}`).send(rule).expect(403);
    const adminRows = await request(app).get(`/operations/bookings?search=${marker}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    assert.ok(adminRows.body.total >= 1); assert.ok(adminRows.body.bookings[0].user.email); assert.equal(adminRows.body.bookings[0].user.password, undefined);
    await request(app).get("/operations/overview").set("Authorization", `Bearer ${adminToken}`).expect(200);
    // Emails are queued once after payment, retried on transport failure, and not duplicated by a webhook retry.
    let delivered = 0;
    const queuedEmail = await Email.findByPk(booking.id);
    await queuedEmail.update({ lockedUntil: null, nextAttemptAt: new Date() });
    const transport = require("../lib/account-mail");
    transport.sendAccountMail = async () => { throw new Error("Simulated SMTP outage"); };
    await require("../lib/booking-email").deliver([booking.id]);
    let email = await Email.findByPk(booking.id); assert.equal(email.sentAt, null); assert.ok(email.attempts > 0);
    await email.update({ nextAttemptAt: new Date() });
    transport.sendAccountMail = async message => { assert.ok(message.text.includes(booking.id)); delivered++; };
    await require("../lib/booking-email").deliver([booking.id]);
    await require("../lib/booking-email").deliver([booking.id]);
    assert.equal(delivered, 1);
    console.log("Passed rental operations: stock quantities, concurrent holds, five-minute expiry, return/release, embedded session ownership, monthly recurrence and overrides, permissions, admin details, and email retry/deduplication.");
    console.log("Passed account booking filters: upcoming/past, expired/cancelled history, related details, ownership isolation, and authentication.");
    console.log("Passed: authentication, database pricing, size/time validation, simultaneous reservation conflicts, coach/gear conflicts, accessory persistence, session ownership, signature and amount verification, idempotent confirmation, expired hold release.");
  } finally {
    const bookings = await Booking.findAll({ where: { userId: userIds }, attributes: ["id"] });
    await Email.destroy({ where: { bookingId: bookings.map(b => b.id) } });
    await Availability.destroy({ where: { resourceId: [...productIds, ...(coach ? [coach.id] : [])] } });
    await BookingAccessory.destroy({ where: { bookingId: bookings.map(b => b.id) } });
    await Booking.destroy({ where: { userId: userIds } });
    await ProductAvailability.destroy({ where: { productId: productIds } });
    await HelmetSpec.destroy({ where: { productId: productIds } }); await SuitSpec.destroy({ where: { productId: productIds } });
    await Product.destroy({ where: { id: productIds } }); if (coach) await coach.destroy();
    await User.destroy({ where: { id: userIds } });
  }
})().catch(error => { console.error("Booking verification failed:", error.message); process.exitCode = 1; }).finally(() => sequelize.close());
