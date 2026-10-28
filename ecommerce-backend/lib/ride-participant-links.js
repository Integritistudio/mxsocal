const crypto = require("node:crypto");
function token(participant) {
  const secret = process.env.RIDE_LINK_SECRET || process.env.JWT_SECRET;
  if (!secret || (process.env.NODE_ENV === "production" && Buffer.byteLength(secret) < 32)) throw new Error("Configure a strong ride link secret.");
  return crypto.createHmac("sha256", secret).update(`ride-participant:v1:${participant.requestId}:${participant.id}`).digest("hex");
}
function valid(participant, value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) return false;
  return crypto.timingSafeEqual(Buffer.from(token(participant), "hex"), Buffer.from(value, "hex"));
}
function url(participant) {
  const origin = new URL(process.env.FRONTEND_URL || "http://localhost:3000").origin;
  return `${origin}/ride/complete/${participant.id}#token=${token(participant)}`;
}
module.exports = { token, valid, url };
