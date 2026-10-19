const router = require("express").Router();
const { Op } = require("sequelize");
const sequelize = require("../config/database");
const { Product } = require("../models/product.model");
const Coach = require("../models/coach.model");
const User = require("../models/user.model");
const { Booking, BookingAccessory } = require("../models/booking.model");
const Availability = require("../models/resource-availability.model");
const Email = require("../models/booking-email.model");
const { validateMonthBody } = require("../lib/resource-availability");
router.use(require("../middleware/auth.middleware"), require("../middleware/account-access.middleware").staff);
const allowed = (req, permission) => req.user.role === "admin" || req.user.permissions?.includes(permission);
const permit = permission => (req, res, next) => allowed(req, permission) ? next() : res.status(403).json({ message: "You do not have permission for this action." });
const validId = id => /^[a-f0-9-]{36}$/i.test(id);
router.get("/resources", async (req, res) => {
  const productsAllowed = allowed(req, "product:update") || allowed(req, "availability:manage");
  const coachesAllowed = allowed(req, "coach:update") || allowed(req, "availability:manage");
  if (!productsAllowed && !coachesAllowed) return res.status(403).json({ message: "Availability editing permission is required." });
  try {
    const [products, coaches] = await Promise.all([productsAllowed ? Product.findAll({ attributes: ["id", "name", "images", "stockQuantity"], order: [["name", "ASC"]] }) : [], coachesAllowed ? Coach.findAll({ attributes: ["id", "firstName", "lastName", "profileImage"], order: [["firstName", "ASC"]] }) : []]);
    res.json({ resources: [...products.map(product => ({ id: product.id, type: "product", name: product.name, image: product.images?.[0], quantity: product.stockQuantity })), ...coaches.map(coach => ({ id: coach.id, type: "coach", name: `${coach.firstName} ${coach.lastName}`, image: coach.profileImage, quantity: 1 }))] });
  } catch { res.status(503).json({ message: "Unable to load resources." }); }
});
const include = [{ model: User, attributes: ["id", "name", "firstName", "lastName", "email", "phone", "country", "state", "city", "zipCode", "address", "profileImage"] }, { model: Product, attributes: ["id", "name", "images", "stockQuantity"] }, { model: BookingAccessory, as: "accessoryItems", include: [{ model: Product, as: "product", attributes: ["id", "name", "images"] }] }];
const present = row => ({ id: row.id, user: row.User, product: row.Product, date: row.bookingDate, slots: row.slots, quantity: row.meta?.quantity || 1, accessories: row.accessoryItems, coach: row.meta?.coach, items: row.meta?.items || [], notes: row.notes, status: row.status, paymentStatus: row.paymentStatus, totalPrice: row.totalPrice, currency: row.meta?.currency || "USD", holdUntil: row.meta?.holdUntil, createdAt: row.createdAt });
router.get("/bookings", permit("booking:view"), async (req, res) => {
  try {
    const where = {};
    if (req.query.search) {
      if (typeof req.query.search !== "string" || req.query.search.length > 100) return res.status(400).json({ message: "Use a shorter search." });
      const pattern = `%${req.query.search.replace(/[\\%_]/g, "\\$&")}%`;
      const [users, products] = await Promise.all([User.findAll({ where: { [Op.or]: [{ name: { [Op.iLike]: pattern } }, { email: { [Op.iLike]: pattern } }] }, attributes: ["id"] }), Product.findAll({ where: { name: { [Op.iLike]: pattern } }, attributes: ["id"] })]);
      where[Op.or] = [{ userId: users.map(user => user.id) }, { productId: products.map(product => product.id) }];
    }
    if (req.query.status) { if (!["pending", "confirmed", "cancelled", "completed"].includes(req.query.status)) return res.status(400).json({ message: "Invalid status." }); where.status = req.query.status; }
    if (req.query.date) { if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) return res.status(400).json({ message: "Invalid date." }); where.bookingDate = req.query.date; }
    const page = Math.max(1, Math.min(100000, Number(req.query.page) || 1));
    const result = await Booking.findAndCountAll({ where, include, distinct: true, order: [["bookingDate", "DESC"], ["createdAt", "DESC"]], limit: 30, offset: (page - 1) * 30 });
    res.json({ bookings: result.rows.map(present), total: result.count, page });
  } catch { res.status(503).json({ message: "Unable to load bookings." }); }
});
router.patch("/bookings/:id", permit("booking:update"), async (req, res) => {
  if (!validId(req.params.id) || !["completed", "confirmed"].includes(req.body.status)) return res.status(400).json({ message: "Choose a valid booking status." });
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (booking.paymentStatus !== "paid" || booking.status === "cancelled") return res.status(409).json({ message: "Only paid, active bookings can be updated. Payments and refunds are managed in Stripe." });
    await booking.update({ status: req.body.status }); res.json({ status: booking.status });
  } catch { res.status(503).json({ message: "Unable to update booking." }); }
});
router.post("/bookings/:id/email", permit("booking:update"), async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(404).end();
    const booking = await Booking.findByPk(req.params.id);
    if (!booking || booking.paymentStatus !== "paid") return res.status(400).json({ message: "Only paid bookings have confirmation emails." });
    const [job] = await Email.findOrCreate({ where: { bookingId: booking.id } });
    await job.update({ sentAt: null, nextAttemptAt: new Date() }); res.json({ message: "Confirmation email queued." });
  } catch { res.status(503).json({ message: "Unable to queue confirmation." }); }
});
router.get("/overview", permit("dashboard:view"), async (req, res) => {
  try {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const [revenue, paidBookings, todaysRides, holds, products, coaches, pendingEmails] = await Promise.all([Booking.sum("totalPrice", { where: { paymentStatus: "paid" } }), Booking.count({ where: { paymentStatus: "paid" } }), Booking.count({ where: { bookingDate: today, status: "confirmed" } }), Booking.count({ where: { status: "pending", paymentStatus: "pending" } }), Product.findAll({ attributes: ["id", "name", "images", "category", "stockQuantity", "status", "available"] }), Coach.count(), Email.count({ where: { sentAt: null } })]);
    const upcoming = allowed(req, "booking:view") ? await Booking.findAll({ where: { bookingDate: { [Op.gte]: today }, status: "confirmed" }, include, order: [["bookingDate", "ASC"]], limit: 8 }) : [];
    res.json({ revenue: Number(revenue || 0), paidBookings, todaysRides, holds, products, coaches, pendingEmails, upcoming: upcoming.map(present), today });
  } catch { res.status(503).json({ message: "Unable to load dashboard data." }); }
});
router.use("/availability/:type/:id", (req, res, next) => {
  if (!["product", "coach"].includes(req.params.type) || !validId(req.params.id)) return res.status(404).end();
  if (!allowed(req, `${req.params.type}:update`) && !allowed(req, "availability:manage")) return res.status(403).json({ message: "Availability editing permission is required." });
  next();
});
router.get("/availability/:type/:id", async (req, res) => {
  try {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(req.query.month || "")) return res.status(400).json({ message: "Choose a month." });
    const records = await Availability.findAll({ where: { resourceType: req.params.type, resourceId: req.params.id, month: { [Op.lte]: req.query.month } }, order: [["month", "DESC"]] });
    const rule = records.find(row => row.month === req.query.month && !row.repeatMonthly) || records.find(row => row.repeatMonthly);
    res.json({ rule: rule || null, defaultHours: "24/7", timeZone: "America/Los_Angeles" });
  } catch { res.status(503).json({ message: "Unable to load availability." }); }
});
router.put("/availability/:type/:id", async (req, res) => {
  try {
    validateMonthBody(req.body);
    const Model = req.params.type === "product" ? Product : Coach;
    await sequelize.transaction(async transaction => {
      if (!await Model.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE })) { const error = new Error("Resource not found."); error.status = 404; throw error; }
      await Availability.upsert({ resourceType: req.params.type, resourceId: req.params.id, month: req.body.month, repeatMonthly: req.body.repeatMonthly, days: req.body.days }, { transaction });
      // A recurring save replaces a previous one-month override for the same month.
      if (req.body.repeatMonthly) await Availability.destroy({ where: { resourceType: req.params.type, resourceId: req.params.id, month: req.body.month, repeatMonthly: false }, transaction });
    });
    res.json({ message: "Availability saved. Existing paid bookings are preserved." });
  } catch (error) { res.status(error.status || 503).json({ message: error.status ? error.message : "Unable to save availability." }); }
});
module.exports = router;
