const { Op } = require("sequelize");
const ContactMessage = require("../models/contact-message.model");
exports.list = async (req, res) => {
  const { q = "", page = "1" } = req.query;
  if (typeof q !== "string" || q.length > 254 || typeof page !== "string" || !/^[1-9]\d{0,5}$/.test(page)) return res.status(400).json({ message: "Invalid message filters." });
  try {
    const limit = 25, offset = (Number(page) - 1) * limit;
    const pattern = `%${q.trim().replace(/[\\%_]/g, "\\$&")}%`;
    const where = q.trim() ? { [Op.or]: ["name", "email", "topic"].map(field => ({ [field]: { [Op.iLike]: pattern } })) } : {};
    const { rows, count } = await ContactMessage.findAndCountAll({ where, attributes: ["id", "name", "email", "phone", "topic", "message", "createdAt"], order: [["createdAt", "DESC"], ["id", "ASC"]], limit, offset });
    res.set("Cache-Control", "no-store");
    return res.json({ contacts: rows, total: count, hasMore: offset + rows.length < count });
  } catch { return res.status(503).json({ message: "Unable to load contact messages. Please try again." }); }
};
