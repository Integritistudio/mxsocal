const router = require("express").Router();
const { Op } = require("sequelize");
const db = require("../config/database");
const Request = require("../models/ride-request.model");
const User = require("../models/user.model");
const Track = require("../models/track.model");
const Pricing = require("../models/ride-pricing.model");
const Coach = require("../models/coach.model");
const { Booking } = require("../models/booking.model");
const service = require("../lib/ride-requests");
const { uuid } = require("../lib/ride-request-validation");
const auth = require("../middleware/auth.middleware");
const access = require("../middleware/account-access.middleware");
const error = (res, e) => res.status(e.status || 503).json({ message: e.status ? e.message : "Unable to process your ride request. Please try again." });
const permit = key => (req, res, next) => req.user.role === "admin" || req.user.permissions?.includes(key) ? next() : res.status(403).json({ message: "You do not have permission for this action." });
router.get("/catalog", access.optionalAccount, async (req, res) => {
  try { res.json({ ...await service.catalog(req.query.startDate, req.query.endDate), needsCoach: req.account?.needsCoach !== false }); } catch (e) { error(res, e); }
});
router.use(auth);
router.get("/pricing", access.admin, async (_req, res) => {
  try { const pricing = await Pricing.findByPk("default"); const coaches = await Coach.findAll({ attributes: ["id", "firstName", "lastName", "dailyRate"], order: [["displayOrder", "ASC"], ["firstName", "ASC"]] }); res.json({ gearDailyRate: pricing?.gearDailyRate ?? null, coaches }); }
  catch (e) { error(res, e); }
});
router.put("/pricing", access.admin, async (req, res) => {
  const rate = value => value === null || (typeof value === "string" && /^\d{1,6}(\.\d{1,2})?$/.test(value));
  if (!rate(req.body?.gearDailyRate) || !Array.isArray(req.body?.coaches) || req.body.coaches.length > 100 || req.body.coaches.some(c => !c || !uuid(c.id) || !rate(c.dailyRate)) || new Set(req.body.coaches.map(c => c.id)).size !== req.body.coaches.length) return res.status(400).json({ message: "Enter valid daily rates in USD with up to two decimal places. Leave a rate blank to disable it." });
  try {
    await db.transaction(async transaction => {
      for (const input of [...req.body.coaches].sort((a, b) => a.id.localeCompare(b.id))) {
        const coach = await Coach.findByPk(input.id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!coach) { const e = new Error("One of these coaches no longer exists. Refresh the rates."); e.status = 409; throw e; }
        await coach.update({ dailyRate: input.dailyRate }, { transaction });
      }
      await Pricing.upsert({ id: "default", gearDailyRate: req.body.gearDailyRate }, { transaction });
    });
    res.json({ message: "Daily rental rates saved." });
  } catch (e) { error(res, e); }
});
router.get("/mine", async (req, res) => {
  try { res.json({ requests: await Request.findAll({ where: { userId: req.user.id }, order: [["createdAt", "DESC"]], limit: 100 }) }); } catch (e) { error(res, e); }
});
router.get("/admin", access.staff, permit("booking:view"), async (req, res) => {
  try { res.json({ requests: await Request.findAll({ include: [{ model: User, attributes: ["id", "name", "email", "phone", "needsCoach"] }], order: [["createdAt", "DESC"]], limit: 100 }) }); } catch (e) { error(res, e); }
});
router.post("/quote", async (req, res) => {
  try { res.json(await service.quote(req.body, req.account)); } catch (e) { error(res, e); }
});
router.post("/", access.accountLimit, async (req, res) => {
  if (req.user.role !== "user") return res.status(403).json({ message: "Please use a customer account to request a ride." });
  if (!uuid(req.body?.clientKey) || req.body.privacyAccepted !== true) return res.status(400).json({ message: "Accept the privacy policy before requesting your booking." });
  try {
    const existing = await Request.findOne({ where: { userId: req.user.id, clientKey: req.body.clientKey } });
    if (existing) return res.json({ request: existing });
    const result = await service.quote(req.body, req.account);
    if (req.body.expectedTotalAmount !== result.estimate.totalAmount) return res.status(409).json({ message: "Your estimate changed. Refresh availability and review the updated total before submitting." });
    const [request] = await Request.findOrCreate({ where: { userId: req.user.id, clientKey: req.body.clientKey }, defaults: { ...result, startDate: result.draft.startDate, endDate: result.draft.endDate, privacyAcceptedAt: new Date() } });
    res.status(201).json({ request });
  } catch (e) { error(res, e); }
});
router.patch("/admin/:id", access.staff, permit("booking:update"), async (req, res) => {
  if (!uuid(req.params.id) || !["approved", "rejected", "cancelled"].includes(req.body?.status) || (req.body.note !== undefined && (typeof req.body.note !== "string" || req.body.note.length > 1000))) return res.status(400).json({ message: "Choose a valid request action and a note under 1,000 characters." });
  try {
    const request = await db.transaction(async transaction => {
      const request = await Request.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!request) { const e = new Error("Ride request not found."); e.status = 404; throw e; }
      if (request.status === req.body.status) return request;
      if (!(["approved", "rejected", "cancelled"].includes(req.body.status) && request.status === "requested") && !(request.status === "approved" && req.body.status === "cancelled")) { const e = new Error("This request has already been reviewed."); e.status = 409; throw e; }
      if (req.body.status === "approved") {
        if (request.draft.trackId) await Track.findByPk(request.draft.trackId, { transaction, lock: transaction.LOCK.UPDATE });
        const account = await User.findByPk(request.userId, { transaction, lock: transaction.LOCK.UPDATE });
        await service.lockSelections(request.draft, transaction);
        const checked = await service.quote(request.draft, account, transaction);
        if (checked.estimate.totalAmount !== request.estimate.totalAmount) { const e = new Error("Daily prices changed since this request. Ask the customer to review and submit a new request."); e.status = 409; throw e; }
        await service.reserve(request, transaction);
      }
      if (req.body.status === "cancelled") await Booking.update({ status: "cancelled" }, { where: { meta: { [Op.contains]: { requestId: request.id } } }, transaction });
      await request.update({ status: req.body.status, reviewedBy: req.user.id, reviewedAt: new Date(), adminNote: req.body.note?.trim() || null }, { transaction });
      return request;
    });
    res.json({ request });
  } catch (e) { error(res, e); }
});
module.exports = router;
