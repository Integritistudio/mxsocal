const User = require("../models/user.model");
module.exports = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ["id", "role", "permissions"] });
    const readList = req.method === "GET" && req.path === "/admin" && user?.permissions?.includes("product:view");
    if (!user || !["admin", "manager"].includes(user.role) || (user.role !== "admin" && !user.permissions?.includes("product:update") && !readList)) {
      return res.status(403).json({ message: "You do not have permission to manage products and reviews." });
    }
    next();
  } catch { res.status(503).json({ message: "Unable to check permissions. Please try again." }); }
};
