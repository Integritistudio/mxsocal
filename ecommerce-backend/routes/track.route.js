const router = require("express").Router();
const controller = require("../controllers/track.controller");
router.get("/", controller.list);
router.get("/:slug", controller.detail);
router.put("/:slug/availability", require("../middleware/auth.middleware"), require("../middleware/account-access.middleware").staff, controller.saveAvailability);
module.exports = router;
