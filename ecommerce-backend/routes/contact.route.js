const router = require("express").Router();
const ContactMessage = require("../models/contact-message.model");
const sequelize = require("../config/database");
const mail = require("../lib/contact-email");
const topics = ["General inquiry", "Bookings", "Bikes & equipment", "Coaching", "Other"];

router.post("/", async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) return res.status(400).json({ message: "Invalid request" });
  if (body.website) return res.status(201).json({ message: "Message received" });
  const fields = ["name", "email", "topic", "message"];
  if (fields.some(key => typeof body[key] !== "string") || (body.phone != null && typeof body.phone !== "string")) return res.status(400).json({ message: "Invalid fields" });
  const name = body.name.trim();
  const email = body.email.trim().toLowerCase();
  const phone = (body.phone || "").trim();
  const message = body.message.trim();
  if (name.length < 2 || name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !topics.includes(body.topic) || message.length < 10 || message.length > 5000 || (phone && !/^[+0-9() .-]{7,30}$/.test(phone))) return res.status(400).json({ message: "Please check your contact details" });
  try {
    await sequelize.transaction(async transaction => {
      const contact = await ContactMessage.create({ name, email, phone: phone || null, topic: body.topic, message }, { transaction });
      await mail.queue(contact.id, "contact", transaction);
    });
    return res.status(201).json({ message: "Message received" });
  } catch (error) {
    console.error("Contact message could not be saved:", error.name);
    return res.status(503).json({ message: "Unable to save your message. Please try again later." });
  }
});

router.get("/admin", require("../middleware/auth.middleware"), require("../middleware/account-access.middleware").admin, require("../controllers/contact-admin.controller").list);

module.exports = router;
