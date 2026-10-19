const express = require("express");
const router = express.Router();
const notif = require("../controllers/notification.controller");
const auth = require("../middleware/auth.middleware");
const { staff } = require("../middleware/account-access.middleware");

router.post("/", auth, staff, notif.createNotification);
router.get("/", auth, staff, notif.getNotifications);
router.patch("/:id/read", auth, staff, notif.markRead);

module.exports = router;
