const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const { staff } = require("../middleware/account-access.middleware");
const bookingCtrl = require("../controllers/booking.controller");

// All booking writes use inventory locks and server-side pricing.
router.post("/", auth, staff, require("../controllers/rental-checkout.controller").checkout);
router.get("/", auth, staff, bookingCtrl.getBookings);
router.get("/:id", auth, staff, bookingCtrl.getBookingById);
router.patch("/:id/status", auth, staff, (_req, res) => res.status(410).json({ message: "Use the bookings management screen to update paid bookings." }));
router.delete("/:id", auth, staff, (_req, res) => res.status(410).json({ message: "Use the checkout release action for unpaid reservations. Manage paid refunds in Stripe." }));

module.exports = router;
