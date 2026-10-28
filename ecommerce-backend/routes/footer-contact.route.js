const router = require("express").Router();
const controller = require("../controllers/footer-contact.controller");
const auth = require("../middleware/auth.middleware");
const { admin } = require("../middleware/account-access.middleware");
// Bounded, process-local spam protection. Public responses never reveal storage status.
const buckets = new Map();
function limit(req, res, next) {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.until <= now) buckets.delete(key);
  // Key by normalized address so a shared application proxy does not throttle all visitors together.
  const identity = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase().slice(0, 254) : req.ip;
  const key = require("node:crypto").createHash("sha256").update(identity || "unknown").digest("hex");
  const bucket = buckets.get(key) || { count: 0, until: now + 15 * 60000 };
  if (bucket.count >= 30 || (!buckets.has(key) && buckets.size >= 10000)) return res.status(202).json({ message: "Thanks for your interest in MXSoCal!" });
  bucket.count++; buckets.set(key, bucket); next();
}
router.post("/", limit, controller.submit);
router.get("/admin", auth, admin, controller.list);
module.exports = router;
