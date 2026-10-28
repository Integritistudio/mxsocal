const Participant = require("../models/ride-participant.model");
const Request = require("../models/ride-request.model");
const auth = require("../middleware/auth.middleware");
const links = require("../lib/ride-participant-links");
const checkout = require("../lib/ride-participant-checkout");
const { uuid } = require("../lib/ride-request-validation");
const error = (res, e) => res.status(e.status || 503).json({ message: e.status ? e.message : "Unable to complete this step. Please try again." });
exports.access = async (req, res, next) => {
  try {
    if (!uuid(req.params.id)) return res.status(404).json({ message: "Rider not found." });
    const participant = await Participant.findByPk(req.params.id);
    if (!participant) return res.status(404).json({ message: "Rider not found." });
    const token = req.headers["x-ride-token"];
    if (token) {
      if (!links.valid(participant, token)) return res.status(403).json({ message: "This personal ride link is invalid." });
      return next();
    }
    return auth(req, res, async () => {
      try {
        const request = await Request.findByPk(participant.requestId);
        if (participant.riderIndex !== 0 || request?.userId !== req.user.id) return res.status(403).json({ message: "Use your own personal ride link to continue." });
        next();
      } catch (e) { error(res, e); }
    });
  } catch (e) { error(res, e); }
};
exports.view = async (req, res) => {
  try { await checkout.reconcile(req.params.id); res.set("Cache-Control", "no-store").json(await checkout.view(req.params.id)); } catch (e) { error(res, e); }
};
exports.sign = async (req, res) => {
  try { await checkout.sign(req.params.id, req.body, { ip: req.ip, userAgent: String(req.headers["user-agent"] || "").slice(0, 500) }); res.json(await checkout.view(req.params.id)); } catch (e) { error(res, e); }
};
exports.pay = async (req, res) => {
  try { await checkout.reconcile(req.params.id); res.json(await checkout.checkout(req.params.id)); } catch (e) { error(res, e); }
};
exports.resend = async (req, res) => {
  try {
    await checkout.locked(req.params.id, async (request, participant, transaction) => {
      const staff = req.user.role === "admin" || req.user.permissions?.includes("booking:update");
      if (!staff && (request.userId !== req.user.id || participant.riderIndex === 0)) checkout.fail("You cannot resend this rider's link.", 403);
      checkout.ensureOpen(request);
      if (participant.paidAt) checkout.fail("This rider has already completed payment.");
      if (participant.lastLinkSentAt && Date.now() - new Date(participant.lastLinkSentAt).getTime() < 60000) checkout.fail("Please wait a minute before resending this link.", 429);
      await require("../lib/ride-request-email").queueParticipant(participant, transaction, true);
    });
    res.json({ message: "The rider's personal link is queued for email delivery." });
  } catch (e) { error(res, e); }
};
exports.webhook = async (req, res) => {
  if (!process.env.STRIPE_RIDE_WEBHOOK_SECRET) return res.status(503).json({ message: "Ride payment webhook is not configured." });
  let event;
  try { event = checkout.stripe().webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_RIDE_WEBHOOK_SECRET); }
  catch { return res.status(400).json({ message: "Invalid Stripe signature." }); }
  try {
    if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type) && event.data.object.metadata?.rideParticipantId) await checkout.fulfill(event.data.object);
    res.json({ received: true });
  } catch (e) { error(res, e); }
};
