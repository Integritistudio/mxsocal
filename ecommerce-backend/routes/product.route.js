const express = require("express");
const router = express.Router();
const product = require("../controllers/product.controller");
const auth = require("../middleware/auth.middleware");
const bikes = require("../controllers/public-bike.controller");
const details = require("../controllers/product-detail.controller");
const { staff } = require("../middleware/account-access.middleware");
const manage = require("../middleware/product-admin.middleware");
const { parseReview, reviewLimit } = require("../middleware/review-upload.middleware");

router.post("/photo", auth, manage, parseReview, require("../controllers/product-photo.controller").upload);
router.get("/photos/:filename", require("../controllers/product-photo.controller").image);
router.get("/admin", auth, manage, details.adminList);
router.post("/admin", auth, manage, details.save);
router.put("/admin/:id", auth, manage, details.save);
router.get("/reviews/admin", auth, manage, details.adminReviews);
router.post("/reviews/admin", auth, manage, details.saveReview);
router.put("/reviews/admin/:reviewId", auth, manage, details.saveReview);
router.delete("/reviews/admin/:reviewId", auth, manage, details.deleteReview);
router.get("/:id/detail", require("../middleware/account-access.middleware").optionalAccount, details.detail);
router.get("/review-images/:imageId", details.reviewImage);
router.post("/:id/reviews", auth, reviewLimit, parseReview, details.submitReview);

router.post("/", auth, staff, product.createProduct);
router.get("/", auth, staff, product.getProducts);
router.get("/bikes", bikes.list);
router.get("/bikes/:id", bikes.detail);
router.get("/:id", auth, staff, product.getProductById);
router.post("/:id/availability", auth, staff, product.addAvailability);
router.get("/:id/availability", auth, staff, product.getAvailability);

module.exports = router;
