const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const sequelize = require("../config/database");
const User = require("../models/user.model");
const Challenge = require("../models/email-challenge.model");
const Saved = require("../models/saved-product.model");
const { Product } = require("../models/product.model");
const Review = require("../models/product-review.model");
const mail = require("../lib/account-mail");
const { accountEmail } = require("../lib/account-email-template");
const { generateToken } = require("../helpers/jwt");
const secret = () => { if (!process.env.JWT_SECRET || (process.env.NODE_ENV === "production" && Buffer.byteLength(process.env.JWT_SECRET) < 32)) throw new Error("A strong JWT_SECRET must be configured."); return process.env.JWT_SECRET; };
const hash = value => crypto.createHmac("sha256", secret()).update(value).digest("hex");
const matches = (value, expected) => { const actual = hash(value); return typeof expected === "string" && actual.length === expected.length && crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected)); };
const emailOf = value => typeof value === "string" ? value.trim().toLowerCase() : "";
const validEmail = value => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validPassword = value => typeof value === "string" && value.length > 6 && value.length < 18;
const nameValid = value => typeof value === "string" && value.trim().length >= 1 && value.trim().length <= 100;
const uuid = value => typeof value === "string" && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);
const cookies = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" };
exports.startSession = (res, user, status = 200) => {
  const token = generateToken(user.id, user.role, user.tokenVersion);
  res.cookie("token", token, { ...cookies, maxAge: (user.role === "user" ? 5 : 7) * 86400000 });
  return res.status(status).json({ user: user.toJSON() });
};
function signupFields(body) {
  if (!nameValid(body.firstName) || !nameValid(body.lastName)) return { error: "Enter your first and last names (up to 100 characters each)." };
  const email = emailOf(body.email);
  if (!validEmail(email)) return { error: "Enter a valid email address." };
  if (body.phone != null && (typeof body.phone !== "string" || (body.phone && !/^\+?[\d\s().-]{7,25}$/.test(body.phone)))) return { error: "Enter a valid phone number, or leave it blank." };
  return { data: { firstName: body.firstName.trim(), lastName: body.lastName.trim(), name: `${body.firstName.trim()} ${body.lastName.trim()}`, email, phone: body.phone?.trim() || null } };
}
async function otpMail(challenge, otp) { await mail.sendAccountMail({ email: challenge.email, subject: "Verify your MXSoCal email", html: accountEmail({ code: otp }), text: `Your MXSoCal verification code is ${otp}. It expires in 10 minutes. If you did not request this, you can ignore this email.` }); }
exports.signup = async (req, res) => {
  const { data, error } = signupFields(req.body || {});
  if (error) return res.status(400).json({ message: error });
  if (!validPassword(req.body.password)) return res.status(400).json({ message: "Password must be between 7 and 17 characters." });
  try {
    if (await User.findOne({ where: { email: data.email } })) return res.status(409).json({ message: "An account already exists for this email. Please sign in or reset your password." });
    const latest = await Challenge.findOne({ where: { email: data.email, purpose: "signup" }, order: [["createdAt", "DESC"]] });
    if (latest && Date.now() - new Date(latest.updatedAt).getTime() < 60000) return res.status(429).json({ message: "Please wait a minute before requesting another code." });
    const otp = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
    const challenge = await Challenge.create({ email: data.email, purpose: "signup", payload: { ...data, passwordHash: await bcrypt.hash(req.body.password, 12) }, secretHash: hash(otp), expiresAt: new Date(Date.now() + 600000) });
    try { await otpMail(challenge, otp); } catch { await challenge.destroy(); throw new Error("Delivery failed"); }
    res.status(202).json({ challengeId: challenge.id, message: "We sent a six-digit code to your email. Enter it within 10 minutes." });
  } catch { res.status(503).json({ message: "We couldn’t send the verification email. Please try again shortly." }); }
};
exports.resend = async (req, res) => {
  if (!uuid(req.body?.challengeId)) return res.status(400).json({ message: "Start signup again to request a new code." });
  try {
    const outcome = await sequelize.transaction(async transaction => {
      const c = await Challenge.findByPk(req.body.challengeId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!c || c.purpose !== "signup" || c.consumedAt || new Date(c.createdAt).getTime() < Date.now() - 3600000) return 400;
      if (Date.now() - new Date(c.updatedAt).getTime() < 60000) return 429;
      const otp = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
      await otpMail(c, otp);
      await c.update({ secretHash: hash(otp), expiresAt: new Date(Date.now() + 600000), attempts: 0 }, { transaction });
      return 200;
    });
    res.status(outcome).json({ message: outcome === 200 ? "A new code has been sent to your email." : outcome === 429 ? "Please wait a minute before requesting another code." : "This signup request expired. Please start again." });
  } catch { res.status(503).json({ message: "Unable to send a new code. Please try again." }); }
};
exports.verify = async (req, res) => {
  if (!uuid(req.body?.challengeId) || !/^\d{6}$/.test(req.body?.code || "")) return res.status(400).json({ message: "Enter the six-digit code from your email." });
  try {
    const result = await sequelize.transaction(async transaction => {
      const c = await Challenge.findByPk(req.body.challengeId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!c || c.purpose !== "signup" || c.consumedAt || c.attempts >= 5 || new Date(c.expiresAt).getTime() <= Date.now()) return null;
      if (!matches(req.body.code, c.secretHash)) { await c.increment("attempts", { transaction }); return null; }
      if (await User.findOne({ where: { email: c.email }, transaction })) return null;
      const { passwordHash, ...data } = c.payload;
      const user = await User.create({ ...data, email: c.email, password: passwordHash, role: "user", permissions: [], emailVerifiedAt: new Date() }, { transaction, hooks: false });
      await Challenge.update({ consumedAt: new Date(), payload: {} }, { where: { email: c.email, purpose: "signup", consumedAt: null }, transaction });
      return user;
    });
    if (!result) return res.status(400).json({ message: "The code is invalid, expired, or has too many attempts. Request a new code or start signup again." });
    exports.startSession(res, result, 201);
  } catch { res.status(409).json({ message: "We couldn’t complete signup. Please sign in if your email is already registered." }); }
};
async function sendLink(user, purpose) {
  const challenge = await Challenge.create({ email: user.email, purpose, payload: { userId: user.id, version: user.tokenVersion }, secretHash: hash(crypto.randomUUID()), expiresAt: new Date(Date.now() + (purpose === "invite" ? 86400000 : 900000)) });
  const token = jwt.sign({ sub: user.id, jti: challenge.id, purpose, version: user.tokenVersion }, secret(), { algorithm: "HS256", expiresIn: purpose === "invite" ? "24h" : "15m", audience: "mxsocal-password" });
  await challenge.update({ secretHash: hash(token) });
  const base = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
  await mail.sendAccountMail({ email: user.email, html: accountEmail({ purpose, url: `${base}/reset-password#token=${encodeURIComponent(token)}` }), subject: purpose === "invite" ? "Your MXSoCal account invitation" : "Reset your MXSoCal password", text: `${purpose === "invite" ? "You’ve been invited to MXSoCal. Verify your email and choose your own password" : "Reset your password"}:\n\n${base}/reset-password#token=${encodeURIComponent(token)}\n\nThis link expires in ${purpose === "invite" ? "24 hours" : "15 minutes"} and can only be used once. If you did not request it, ignore this email.` });
}
exports.forgot = async (req, res) => {
  const email = emailOf(req.body?.email);
  if (!validEmail(email)) return res.status(400).json({ message: "Enter a valid email address." });
  if (!(process.env.MAIL_FROM || process.env.SMTP_FROM || process.env.SES_FROM_EMAIL || process.env.AWS_SES_FROM_EMAIL)) return res.status(503).json({ message: "Account email is temporarily unavailable. Please try again later." });
  try {
    const user = await User.findOne({ where: { email } });
    if (user) {
      const latest = await Challenge.findOne({ where: { email, purpose: { [Op.in]: ["reset", "invite"] } }, order: [["createdAt", "DESC"]] });
      if (!latest || Date.now() - new Date(latest.createdAt).getTime() > 60000) await sendLink(user, user.emailVerifiedAt || user.role !== "user" ? "reset" : "invite");
    }
  } catch { console.warn("Account email delivery failed."); }
  res.json({ message: "If this email is linked to an MXSoCal account, you?ll receive a link to choose a new password." });
};
exports.reset = async (req, res) => {
  if (!validPassword(req.body?.password) || typeof req.body?.token !== "string" || req.body.token.length > 3000) return res.status(400).json({ message: "Use a valid reset link and a password between 7 and 17 characters." });
  try {
    const payload = jwt.verify(req.body.token, secret(), { algorithms: ["HS256"], audience: "mxsocal-password" });
    if (!["reset", "invite"].includes(payload.purpose) || !uuid(payload.jti)) throw new Error("Invalid token");
    const user = await sequelize.transaction(async transaction => {
      const c = await Challenge.findByPk(payload.jti, { transaction, lock: transaction.LOCK.UPDATE });
      const user = await User.findByPk(payload.sub, { transaction, lock: transaction.LOCK.UPDATE });
      if (!c || !user || c.consumedAt || c.purpose !== payload.purpose || c.email !== user.email || c.payload.userId !== user.id || payload.version !== user.tokenVersion || new Date(c.expiresAt).getTime() <= Date.now() || !matches(req.body.token, c.secretHash)) return null;
      await user.update({ password: req.body.password, emailVerifiedAt: user.emailVerifiedAt || new Date(), tokenVersion: user.tokenVersion + 1 }, { transaction });
      await Challenge.update({ consumedAt: new Date(), payload: {} }, { where: { email: user.email, purpose: { [Op.in]: ["reset", "invite"] }, consumedAt: null }, transaction });
      return user;
    });
    if (!user) throw new Error("Invalid token");
    if (payload.purpose === "invite" && user.role === "user") return exports.startSession(res, user);
    res.clearCookie("token", cookies).json({ message: "Your password has been updated. Please sign in again." });
  } catch { res.status(400).json({ message: "This link is invalid, expired, or already used. Request a new password link." }); }
};
const genders = ["", "woman", "man", "non-binary", "transgender", "genderfluid", "agender", "self-describe", "prefer-not-to-say"];
exports.updateProfile = async (req, res) => {
  const body = req.body || {}; const data = {};
  for (const key of ["firstName", "lastName"]) if (body[key] !== undefined) { if (!nameValid(body[key])) return res.status(400).json({ message: "Enter your first and last names." }); data[key] = body[key].trim(); }
  for (const [key, max] of Object.entries({ phone: 25, country: 100, state: 100, city: 100, zipCode: 20, bio: 2000, address: 1000 })) if (body[key] !== undefined) { if (typeof body[key] !== "string" || body[key].length > max) return res.status(400).json({ message: `Check your ${key}.` }); data[key] = body[key].trim() || null; }
  if (data.phone && !/^\+?[\d\s().-]{7,25}$/.test(data.phone)) return res.status(400).json({ message: "Enter a valid phone number, or leave it blank." });
  if (body.name !== undefined && req.user.role !== "user" && nameValid(body.name)) data.name = body.name.trim();
  if (body.gender !== undefined) { if (!genders.includes(body.gender)) return res.status(400).json({ message: "Choose a gender option." }); data.gender = body.gender || null; }
  if (body.genderDescription !== undefined) { if (typeof body.genderDescription !== "string" || body.genderDescription.length > 100) return res.status(400).json({ message: "Keep your gender description under 100 characters." }); data.genderDescription = body.genderDescription.trim() || null; }
  if (body.dateOfBirth !== undefined) { if (body.dateOfBirth && (!/^\d{4}-\d{2}-\d{2}$/.test(body.dateOfBirth) || !Number.isFinite(Date.parse(body.dateOfBirth)) || new Date(body.dateOfBirth).toISOString().slice(0, 10) !== body.dateOfBirth || body.dateOfBirth > new Date().toISOString().slice(0, 10) || body.dateOfBirth < "1900-01-01")) return res.status(400).json({ message: "Enter a valid date of birth that is not in the future." }); data.dateOfBirth = body.dateOfBirth || null; }
  try { const user = req.account; if (data.firstName || data.lastName) data.name = `${data.firstName || user.firstName || user.name.split(" ")[0]} ${data.lastName || user.lastName || ""}`.trim(); await user.update(data); res.json(user.toJSON()); }
  catch { res.status(503).json({ message: "Unable to save your profile." }); }
};
exports.listCustomers = async (_req, res) => { try { res.json((await User.findAll({ where: { role: "user" }, attributes: { exclude: ["password", "avatarData", "avatarContentType", "tokenVersion"] }, order: [["createdAt", "DESC"]] })).map(u => u.toJSON())); } catch { res.status(503).json({ message: "Unable to load customers." }); } };
exports.invite = async (req, res) => {
  if (Object.hasOwn(req.body || {}, "password")) return res.status(400).json({ message: "Customers must choose their own passwords through their invitation." });
  const { data, error } = signupFields(req.body || {});
  if (error) return res.status(400).json({ message: error });
  try {
    const [user, created] = await User.findOrCreate({ where: { email: data.email }, defaults: { ...data, role: "user", permissions: [], password: null } });
    if (user.role !== "user" || (!created && user.emailVerifiedAt)) return res.status(409).json({ message: "An account already exists for this email." });
    await sendLink(user, "invite");
    res.status(created ? 201 : 200).json({ message: "Invitation sent. The customer will verify their email and choose their own password.", user: user.toJSON() });
  } catch { res.status(503).json({ message: "Unable to send the invitation. The pending customer can be invited again with the same email." }); }
};
exports.savedList = async (req, res) => {
  try {
    const saved = await Saved.findAll({ where: { userId: req.user.id }, order: [["createdAt", "DESC"]] });
    const products = await Product.findAll({ where: { id: saved.map(s => s.productId), available: true, status: "available" }, attributes: ["id", "slug", "name", "category", "images", "pricePerDay", "currency"] });
    res.json({ ids: saved.map(s => s.productId), products });
  } catch { res.status(503).json({ message: "Unable to load saved products." }); }
};
exports.saveProduct = async (req, res) => {
  if (!uuid(req.params.id)) return res.status(404).json({ message: "Product not found." });
  try { if (req.method === "DELETE") { await Saved.destroy({ where: { userId: req.user.id, productId: req.params.id } }); return res.json({ saved: false }); } if (!await Product.findOne({ where: { id: req.params.id, available: true, status: "available" } })) return res.status(404).json({ message: "Product not found." }); await Saved.findOrCreate({ where: { userId: req.user.id, productId: req.params.id } }); res.json({ saved: true }); }
  catch { res.status(503).json({ message: "Unable to update saved products." }); }
};
exports.myReviews = async (req, res) => { try { const reviews = await Review.findAll({ where: { userId: req.user.id }, attributes: { exclude: ["email"] }, order: [["createdAt", "DESC"]] }); const products = await Product.findAll({ where: { id: [...new Set(reviews.map(r => r.productId))] }, attributes: ["id", "name", "slug", "category"] }); res.json({ reviews, products }); } catch { res.status(503).json({ message: "Unable to load your reviews." }); } };
exports.avatar = async (req, res) => {
  try { if (req.method === "GET") { const avatar = await User.findByPk(req.user.id, { attributes: ["avatarData", "avatarContentType"] }); if (!avatar?.avatarData) return res.status(404).end(); return res.set({ "Content-Type": avatar.avatarContentType, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" }).send(avatar.avatarData); } const image = req.reviewImages?.[0]; if (!image || req.reviewImages.length !== 1) return res.status(400).json({ message: "Choose one JPG or PNG profile photo under 5 MB." }); await req.account.update({ avatarData: image.data, avatarContentType: image.contentType, profileImage: `/api/customer/avatar?updated=${Date.now()}` }); res.json(req.account.toJSON()); }
  catch { res.status(503).json({ message: "Unable to save your profile photo." }); }
};
exports.customerAvatar = async (req, res) => {
  if (!uuid(req.params.id)) return res.status(404).end();
  try { const user = await User.findOne({ where: { id: req.params.id, role: "user" }, attributes: ["avatarData", "avatarContentType"] }); if (!user?.avatarData) return res.status(404).end(); res.set({ "Content-Type": user.avatarContentType, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" }).send(user.avatarData); }
  catch { res.status(503).end(); }
};

exports.listAccounts = async (_req, res) => { try { res.json((await User.findAll({ attributes: ["id", "name", "email", "role", "phone", "createdAt"], order: [["createdAt", "DESC"]] })).map(u => u.toJSON())); } catch { res.status(503).json({ message: "Unable to load users." }); } };
