const { Op } = require("sequelize");
const db = require("../config/database");
const Request = require("../models/ride-request.model");
const Participant = require("../models/ride-participant.model");
const { Booking } = require("../models/booking.model");
const { splitAmounts, riderItems } = require("./ride-participant-pricing");
const { currentDate } = require("./track-availability");
const terms = require("./ride-waiver-terms");
const fail = (message, status = 409) => { const error = new Error(message); error.status = status; throw error; };
function stripe() {
  if (!/^sk_(test|live)_/.test(process.env.STRIPE_SECRET_KEY || "")) fail("Stripe checkout is not configured.", 503);
  return require("stripe")(process.env.STRIPE_SECRET_KEY, { timeout: 10000, maxNetworkRetries: 1 });
}
function ensureOpen(request) {
  if (request.status !== "pending_payment") fail("This ride is not awaiting payment.");
  if (request.startDate < currentDate()) fail("The first ride day has passed. Contact MXSoCal before paying.");
}
async function initialize(request, transaction) {
  const amounts = splitAmounts(request);
  if (amounts.some(amount => amount > 0 && amount < 50)) fail("Each rider's charge must be at least $0.50 for online payment.");
  // Validate link configuration before committing admin approval.
  require("./ride-participant-links").token({ id: request.id, requestId: request.id });
  for (const [index, rider] of request.draft.riders.entries()) {
    const [participant] = await Participant.findOrCreate({ where: { requestId: request.id, riderIndex: index }, defaults: { name: rider.name, email: rider.email, amountCents: amounts[index] }, transaction });
    await require("./ride-request-email").queueParticipant(participant, transaction);
  }
}
async function locked(id, callback) {
  // All writes lock the request first so simultaneous riders cannot miss group completion.
  const row = await Participant.findByPk(id, { attributes: ["id", "requestId"] });
  if (!row) fail("Rider not found.", 404);
  return db.transaction(async transaction => {
    const request = await Request.findByPk(row.requestId, { transaction, lock: transaction.LOCK.UPDATE });
    const participant = await Participant.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!request || !participant) fail("Ride not found.", 404);
    return callback(request, participant, transaction);
  });
}
async function completeGroup(request, transaction) {
  const riders = await Participant.findAll({ where: { requestId: request.id }, transaction });
  if (request.status !== "pending_payment" || riders.length !== request.draft.riders.length || riders.some(rider => !rider.signedAt || !rider.paidAt)) return;
  await request.update({ status: "approved" }, { transaction });
  await Booking.update({ status: "confirmed", paymentStatus: "paid" }, { where: { meta: { [Op.contains]: { requestId: request.id } }, status: "pending" }, transaction });
}
async function fulfill(session) {
  if (session.payment_status !== "paid") return;
  if (!session.metadata?.rideParticipantId) fail("Missing rider payment metadata.");
  return locked(session.metadata.rideParticipantId, async (request, participant, transaction) => {
    if (session.metadata.rideRequestId !== request.id || session.client_reference_id !== participant.id || session.amount_total !== participant.amountCents || session.currency !== participant.currency || session.livemode !== process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") || !participant.signedAt || session.metadata.checkoutAttempt !== String(participant.checkoutAttempt) || (participant.stripeSessionId && participant.stripeSessionId !== session.id)) fail("Payment does not match this rider.");
    if (participant.paidAt) return;
    if (!["pending_payment", "approved"].includes(request.status)) fail("Payment received for a closed request. Manual review is required.");
    await participant.update({ paidAt: new Date(), stripeSessionId: session.id, paymentIntentId: session.payment_intent }, { transaction });
    await require("./ride-request-email").queuePaymentReceipt(participant, transaction);
    await completeGroup(request, transaction);
  });
}
async function sign(id, body, audit) {
  return locked(id, async (request, participant, transaction) => {
    ensureOpen(request);
    if (participant.signedAt) return;
    const name = typeof body.signature === "string" ? body.signature.trim() : "";
    if (body.accepted !== true || body.version !== terms.version || name.length < 2 || name.length > 100 || !["self", "guardian"].includes(body.signerRole) || body.adultConfirmed !== true) fail("Read the current terms, enter your full name, and confirm you are an adult rider or legal guardian.", 400);
    if (Number(request.draft.riders[participant.riderIndex].age) < 18 && body.signerRole !== "guardian") fail("A parent or legal guardian must sign for this rider.", 400);
    await participant.update({ signedAt: new Date(), waiver: { ...terms, signature: name, signerRole: body.signerRole, accepted: true, adultConfirmed: true, riderName: participant.name, riderIndex: participant.riderIndex, requestId: request.id, startDate: request.startDate, endDate: request.endDate, amountCents: participant.amountCents, ...audit }, ...(participant.amountCents === 0 ? { paidAt: new Date() } : {}) }, { transaction });
    if (participant.paidAt) await require("./ride-request-email").queuePaymentReceipt(participant, transaction);
    await completeGroup(request, transaction);
  });
}
async function checkout(id) {
  // Stable parameters and key allow recovery if Stripe succeeds but the DB write fails.
  return locked(id, async (request, participant, transaction) => {
    ensureOpen(request);
    if (!participant.signedAt) fail("Sign your liability waiver before paying.");
    if (participant.paidAt) fail("This rider has already paid.");
    if (participant.amountCents < 50) fail("This amount cannot be charged online. Contact MXSoCal.");
    const client = stripe();
    if (participant.stripeSessionId) {
      const previous = await client.checkout.sessions.retrieve(participant.stripeSessionId);
      if (previous.payment_status === "paid") fail("Your payment has been received. Refresh to verify it.");
      if (previous.status === "open") return { url: previous.url };
      if (previous.status !== "expired") fail("Your payment is being processed. Refresh shortly.");
      await participant.update({ checkoutAttempt: participant.checkoutAttempt + 1, stripeSessionId: null }, { transaction });
    }
    let session = await createSession(client, request, participant);
    // Recover an uncertain create from a previous process failure, even if it expired.
    if (session.status === "expired") {
      await participant.update({ checkoutAttempt: participant.checkoutAttempt + 1 }, { transaction });
      session = await createSession(client, request, participant);
    }
    await participant.update({ stripeSessionId: session.id }, { transaction });
    if (session.status !== "open" || !session.url) return { url: require("./ride-participant-links").url(participant) };
    return { url: session.url };
  });
}
async function createSession(client, request, participant) {
  const url = require("./ride-participant-links").url(participant);
  return client.checkout.sessions.create({ mode: "payment", payment_method_types: ["card"], customer_email: participant.email, client_reference_id: participant.id,
    payment_intent_data: { receipt_email: participant.email },
    metadata: { rideParticipantId: participant.id, rideRequestId: request.id, checkoutAttempt: String(participant.checkoutAttempt) },
    success_url: url, cancel_url: url,
    line_items: [{ quantity: 1, price_data: { currency: participant.currency, unit_amount: participant.amountCents, product_data: { name: `MXSoCal ride — ${participant.name} (${request.startDate} – ${request.endDate})` } } }],
  }, { idempotencyKey: `ride-${participant.id}-${participant.checkoutAttempt}` });
}
async function reconcile(id) {
  const participant = await Participant.findByPk(id);
  if (participant?.stripeSessionId && !participant.paidAt) await fulfill(await stripe().checkout.sessions.retrieve(participant.stripeSessionId));
  // Also fills the receipt queue for paid bookings created before receipt emails existed.
  if (participant?.paidAt) await require("./ride-request-email").queuePaymentReceipt(participant);
}
async function view(id) {
  const participant = await Participant.findByPk(id);
  const request = participant && await Request.findByPk(participant.requestId);
  if (!request) fail("Ride not found.", 404);
  let paymentReceiptUrl = null;
  try { paymentReceiptUrl = await receiptUrl(participant); } catch { /* Booking details remain available during a Stripe outage. */ }
  return { id: participant.id, requestId: request.id, riderIndex: participant.riderIndex, receiptUrl: paymentReceiptUrl, name: participant.name, amountCents: participant.amountCents, signedAt: participant.signedAt, paidAt: participant.paidAt, status: request.status, startDate: request.startDate, endDate: request.endDate, track: request.estimate.track?.name, items: riderItems(request, participant.riderIndex), terms, requiresGuardian: Number(request.draft.riders[participant.riderIndex].age) < 18, canComplete: request.status === "pending_payment" && request.startDate >= currentDate() };
}
async function receiptUrl(participant) {
  if (!participant.paidAt || !participant.paymentIntentId) return null;
  const intent = await stripe().paymentIntents.retrieve(participant.paymentIntentId, { expand: ["latest_charge"] });
  if (intent.id !== participant.paymentIntentId || intent.status !== "succeeded" || intent.amount_received !== participant.amountCents || intent.currency !== participant.currency) fail("Receipt does not match this rider's payment.");
  const url = intent.latest_charge?.receipt_url;
  if (!url) return null;
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".stripe.com")) fail("Invalid payment receipt URL.");
  return url;
}
async function cancel(request, transaction) {
  const riders = await Participant.findAll({ where: { requestId: request.id }, transaction });
  // A paid group needs a deliberate refund workflow; never silently release its reservation.
  if (riders.some(rider => rider.paidAt)) fail("A rider has paid. Arrange refunds before cancelling this ride.");
  for (const rider of riders) if (rider.stripeSessionId || (rider.signedAt && rider.amountCents >= 50)) {
    // Recover uncertain Stripe creates before releasing any inventory.
    let session = rider.stripeSessionId ? await stripe().checkout.sessions.retrieve(rider.stripeSessionId) : await createSession(stripe(), request, rider);
    if (session.status === "open") {
      try { session = await stripe().checkout.sessions.expire(session.id); }
      catch { session = await stripe().checkout.sessions.retrieve(session.id); }
    }
    if (session.payment_status === "paid" || session.status !== "expired") fail("A payment has been received or is processing. Review payments before cancelling.");
  }
}
let maintenanceBusy = false;
async function maintenance() {
  if (maintenanceBusy) return;
  maintenanceBusy = true;
  try {
    const riders = await Participant.findAll({ where: { paidAt: null, stripeSessionId: { [Op.ne]: null } }, include: [{ model: Request, where: { status: "pending_payment" }, attributes: [], required: true }], order: [["updatedAt", "ASC"]], limit: 200 });
    for (const rider of riders) {
      try { await reconcile(rider.id); }
      catch (error) { console.error("Ride payment reconciliation will retry:", error.name); }
      finally { rider.changed("updatedAt", true); await rider.save({ fields: ["updatedAt"] }); }
    }
  } finally { maintenanceBusy = false; }
}
module.exports = { initialize, locked, fulfill, sign, checkout, reconcile, view, cancel, stripe, ensureOpen, completeGroup, fail, maintenance, receiptUrl };
