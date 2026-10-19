exports.staff = (req, res, next) => ["admin", "manager"].includes(req.user?.role) ? next() : res.status(403).json({ message: "Staff access is required." });
exports.admin = (req, res, next) => req.user?.role === "admin" ? next() : res.status(403).json({ message: "Admin access is required." });
exports.optionalAccount = async (req, _res, next) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
    const payload = token && require("../helpers/jwt").verifyToken(token);
    if (payload) { const user = await require("../models/user.model").findByPk(payload.id, { attributes: { exclude: ["avatarData", "avatarContentType"] } }); if (user && (payload.version || 0) === user.tokenVersion && (user.role !== "user" || user.emailVerifiedAt)) { req.user = { id: user.id, role: user.role }; req.account = user; } }
  } catch { /* Public pages remain available without a valid session. */ }
  next();
};
const buckets = new Map();
exports.accountLimit = (req, res, next) => {
  const now = Date.now(); for (const [key, value] of buckets) if (value.until < now) buckets.delete(key);
  const key = `ip:${req.ip}`; const value = buckets.get(key) || { count: 0, until: now + 15 * 60000 };
  const identity = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase().slice(0, 254) : req.body?.challengeId || req.user?.id || req.path;
  const subjectKey = `subject:${String(identity).slice(0, 254)}`; const subject = buckets.get(subjectKey) || { count: 0, until: now + 15 * 60000 };
  if (value.count >= 300 || subject.count >= 20 || buckets.size >= 10000) return res.status(429).json({ message: "Too many attempts. Please try again in 15 minutes." });
  value.count++; subject.count++; buckets.set(key, value); buckets.set(subjectKey, subject); next();
};
