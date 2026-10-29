const Track = require("../models/track.model");
const Availability = require("../models/track-availability.model");
const db = require("../config/database");
const { uuid, trackInput } = require("../lib/track-input");
const { availabilityMonths, currentDate, timeZone } = require("../lib/track-availability");
exports.manage = (req, res, next) => req.user?.role === "admin" || (req.user?.role === "manager" && req.user.permissions?.includes("availability:manage")) ? next() : res.status(403).json({ message: "Track management permission is required." });
exports.list = async (_req, res) => {
  try { res.set("Cache-Control", "no-store").json({ tracks: await Track.findAll({ order: [["displayOrder", "ASC"], ["name", "ASC"]] }) }); }
  catch { res.status(503).json({ message: "Unable to load tracks." }); }
};
exports.detail = async (req, res) => {
  if (!uuid(req.params.id)) return res.status(404).json({ message: "Track not found." });
  try {
    const track = await Track.findByPk(req.params.id);
    if (!track) return res.status(404).json({ message: "Track not found." });
    const months = availabilityMonths(), records = await Availability.findAll({ where: { trackId: track.id, month: months } });
    res.set("Cache-Control", "no-store").json({ track, availabilityMonths: months.map(month => { const record = records.find(row => row.month === month); return { month, timeZone, today: currentDate(), days: record?.days || {}, updatedAt: record?.updatedAt || null }; }) });
  } catch { res.status(503).json({ message: "Unable to load track details." }); }
};
exports.save = async (req, res) => {
  if (req.params.id && !uuid(req.params.id)) return res.status(404).json({ message: "Track not found." });
  const input = trackInput(req.body);
  if (input.error) return res.status(400).json({ message: input.error });
  try {
    const track = await db.transaction(async transaction => {
      if (!req.params.id) return Track.create(input.data, { transaction });
      const row = await Track.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      return row ? row.update(input.data, { transaction }) : null;
    });
    if (!track) return res.status(404).json({ message: "Track not found." });
    res.status(req.params.id ? 200 : 201).json({ track });
  } catch (error) { res.status(error.name === "SequelizeUniqueConstraintError" ? 409 : 503).json({ message: error.name === "SequelizeUniqueConstraintError" ? "That track URL name is already in use. Choose another." : "Unable to save the track." }); }
};
exports.remove = async (req, res) => {
  if (!uuid(req.params.id)) return res.status(404).json({ message: "Track not found." });
  try {
    const found = await db.transaction(async transaction => {
      const track = await Track.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!track) return false;
      await Availability.destroy({ where: { trackId: track.id }, transaction });
      await track.destroy({ transaction });
      return true;
    });
    if (!found) return res.status(404).json({ message: "Track not found." });
    res.status(204).end();
  } catch { res.status(503).json({ message: "Unable to remove the track." }); }
};
