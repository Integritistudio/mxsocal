const { Op } = require("sequelize");
const FooterContact = require("../models/footer-contact.model");
const sequelize = require("../config/database");
const mail = require("../lib/contact-email");
const message = "Thanks for your interest in MXSoCal!";
exports.submit = async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!req.body?.website && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    try {
      await sequelize.transaction(async transaction => {
        const [contact, created] = await FooterContact.findOrCreate({ where: { email }, defaults: { email }, transaction });
        if (created) await mail.queue(contact.id, "footer", transaction);
      });
    }
    catch (error) { console.error("Footer contact persistence failed:", error.name); }
  }
  return res.status(202).json({ message });
};
exports.list = async (req, res) => {
  const { q = "", page = "1" } = req.query;
  if (typeof q !== "string" || q.length > 254 || typeof page !== "string" || !/^[1-9]\d{0,5}$/.test(page)) return res.status(400).json({ message: "Invalid contact filters." });
  try {
    const limit = 25, offset = (Number(page) - 1) * limit;
    const where = q.trim() ? { email: { [Op.iLike]: `%${q.trim().replace(/[\\%_]/g, "\\$&")}%` } } : {};
    const { rows, count } = await FooterContact.findAndCountAll({ where, attributes: ["id", "email", "createdAt"], order: [["createdAt", "DESC"], ["id", "ASC"]], limit, offset });
    res.set("Cache-Control", "no-store");
    return res.json({ contacts: rows, total: count, hasMore: offset + rows.length < count });
  } catch { return res.status(503).json({ message: "Unable to load footer contacts. Please try again." }); }
};
