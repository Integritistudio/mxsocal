const express = require("express");
const router = express.Router();
const user = require("../controllers/user.controller");
const auth = require("../middleware/auth.middleware");
const { admin } = require("../middleware/account-access.middleware");
router.use(auth, admin);
router.post("/staff", user.createManager);

router.get("/", user.getUsers);
router.get("/:id", user.getUserById);
router.delete("/:id", auth, user.deleteUser);
router.patch("/:id", auth, user.updateUser);

module.exports = router;
