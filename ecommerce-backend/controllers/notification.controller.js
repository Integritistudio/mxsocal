const Notification = require("../models/notification.model");
const { emitNotification } = require("../sockets");

exports.createNotification = async (req, res) => {
  try {
    const { type, message, actorId, targetId, bookingId, data } = req.body;
    const notif = await Notification.create({
      type,
      message,
      actorId,
      targetId,
      bookingId,
      data,
    });
    const payload = {
      id: notif.id,
      type: notif.type,
      message: notif.message,
      actorId: notif.actorId,
      bookingId: notif.bookingId,
      data: notif.data,
      createdAt: notif.createdAt,
    };
    if (targetId) {
      emitNotification(`user:${targetId}`, payload);
    } else {
      emitNotification("admin", payload);
    }
    res.status(201).json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const where = {};
    if (req.query.targetId) where.targetId = req.query.targetId;
    const notifs = await Notification.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const id = req.params.id;
    const notif = await Notification.findByPk(id);
    if (!notif) return res.status(404).json({ message: "Not found" });
    notif.read = true;
    await notif.save();
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
