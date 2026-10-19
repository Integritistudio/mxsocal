const express = require("express");
const router = express.Router();
const coach = require("../controllers/coach.controller");
const auth = require("../middleware/auth.middleware");
const { staff } = require("../middleware/account-access.middleware");

router.post("/photo", auth, staff, require("../middleware/review-upload.middleware").parseReview, require("../controllers/coach-photo.controller").upload);
router.get("/photos/:filename", require("../controllers/coach-photo.controller").image);
router.post("/", auth, staff, coach.addCoach);
router.get("/public", coach.getPublicCoaches);
router.get("/", auth, staff, coach.getCoaches);
router.get("/:id", auth, staff, coach.getCoachById);
router.delete("/:id", auth, staff, coach.deleteCoach);
router.patch("/:id", auth, staff, coach.updateCoach);

module.exports = router;
