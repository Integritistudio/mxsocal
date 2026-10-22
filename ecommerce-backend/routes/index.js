const express = require("express");
const multer = require("multer");

const userRoutes = require("./user.route");
const authRoutes = require("./auth.route");
const coachRoutes = require("./coach.route");
const productRoutes = require("./product.route");
const bookingRoutes = require("./booking.route");
const notificationRoutes = require("./notification.route");
const { uploadFiles } = require("../lib/upload");

const upload = multer();
const router = express.Router();
router.use("/contact", require("./contact.route"));

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/coach", coachRoutes);
router.use("/stories", require("./story.route"));
router.use("/tracks", require("./track.route"));
router.use("/products", productRoutes);
router.use("/bookings", bookingRoutes);
router.use("/rental-checkout", require("./rental-checkout.route"));
router.use("/operations", require("./operations.route"));
router.use("/notifications", notificationRoutes);
router.use("/upload", require("../middleware/auth.middleware"), require("../middleware/account-access.middleware").staff, upload.array("files"), uploadFiles);

module.exports = router;
