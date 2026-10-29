const router = require("express").Router();
const { Op } = require("sequelize");
const db = require("../config/database");
const { analyticsRange, summarizeAnalytics } = require("../lib/analytics");
router.use(require("../middleware/auth.middleware"), require("../middleware/account-access.middleware").admin);
router.get("/", async (req, res) => {
  let range;
  try { range = analyticsRange(req.query); } catch (error) { return res.status(400).json({ message: error.message }); }
  try {
    // UTC midnight deliberately overfetches the Pacific boundary; aggregation applies exact local dates.
    const since = new Date(`${range.previousStart}T00:00:00Z`);
    const data = await db.transaction({ isolationLevel: "REPEATABLE READ", readOnly: true }, async transaction => {
      const query = (Model, attributes, where) => Model.findAll({ attributes, ...(where ? { where } : {}), transaction, raw: true });
      const recent = { createdAt: { [Op.gte]: since } };
      const requests = await query(require("../models/ride-request.model"), ["id", "userId", "status", "draft", "estimate", "startDate", "endDate", "createdAt", "reviewedAt", "expiredAt"], recent);
      const [participants, bookings, customers, products, coaches, contacts, signups, reviews] = await Promise.all([
        query(require("../models/ride-participant.model"), ["requestId", "amountCents", "currency", "paidAt", "signedAt"], { [Op.or]: [{ paidAt: { [Op.gte]: since } }, { requestId: requests.map(row => row.id) }] }),
        query(require("../models/booking.model").Booking, ["totalPrice", "paymentStatus", "meta", "updatedAt"], { updatedAt: { [Op.gte]: since } }),
        query(require("../models/user.model"), ["createdAt", "country", "state", "emailVerifiedAt"], { ...recent, role: "user" }),
        query(require("../models/product.model").Product, ["id", "name", "category", "stockQuantity", "status", "available"]),
        query(require("../models/coach.model"), ["id", "firstName", "lastName"]),
        query(require("../models/contact-message.model"), ["topic", "createdAt"], recent),
        query(require("../models/footer-contact.model"), ["createdAt"], recent),
        query(require("../models/product-review.model"), ["rating", "status", "createdAt"], recent),
      ]);
      return summarizeAnalytics({ requests, participants, bookings, customers, products, coaches, contacts, signups, reviews }, range);
    });
    res.set("Cache-Control", "no-store").json(data);
  } catch { res.status(503).json({ message: "Unable to load analytics. Please try again." }); }
});
module.exports = router;
