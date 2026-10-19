const { verifyToken } = require("../helpers/jwt");

module.exports = async (req, res, next) => {
  const token =
    req.cookies?.token || req.headers["authorization"]?.split(" ")[1];
  if (!token)
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  const payload = verifyToken(token);
  if (!payload)
    return res.status(401).json({ message: "Unauthorized: Invalid token" });

  try {
    const user = await require("../models/user.model").findByPk(payload.id, { attributes: { exclude: ["avatarData", "avatarContentType"] } });
    if (!user || (payload.version || 0) !== user.tokenVersion || (user.role === "user" && !user.emailVerifiedAt)) return res.status(401).json({ message: "Your session has expired. Please sign in again." });
    req.user = { id: user.id, role: user.role, permissions: user.permissions, version: user.tokenVersion };
    req.account = user;
    next();
  } catch { res.status(503).json({ message: "Unable to verify your session. Please try again." }); }
};
