const Track = require("../models/track.model");
const Availability = require("../models/track-availability.model");
const { currentDate, availabilityMonths, validateDays, timeZone } = require("../lib/track-availability");
exports.list = async (req, res) => {
  try { res.json({ tracks: await Track.findAll({ order: [["displayOrder", "ASC"], ["name", "ASC"]] }) }); }
  catch { res.status(503).json({ message: "Tracks are temporarily unavailable." }); }
};
exports.detail = async (req, res) => {
  if (!/^[a-z0-9-]{1,180}$/.test(req.params.slug)) return res.status(404).json({ message: "Track not found." });
  try {
    const track = await Track.findOne({ where: { slug: req.params.slug } });
    if (!track) return res.status(404).json({ message: "Track not found." });
    const now = new Date();
    const months = availabilityMonths(now);
    const records = await Availability.findAll({ where: { trackId: track.id, month: months } });
    const calendars = months.map(month => {
      const record = records.find(row => row.month === month);
      return { month, timeZone, today: currentDate(now), days: record?.days || {}, updatedAt: record?.updatedAt || null };
    });
    res.json({ track, availability: calendars[0], availabilityMonths: calendars });
  } catch { res.status(503).json({ message: "Track is temporarily unavailable." }); }
};
exports.saveAvailability = async (req, res) => {
  if (req.user.role !== "admin" && !req.user.permissions?.includes("availability:manage")) return res.status(403).json({ message: "Availability editing permission is required." });
  const month = req.body?.month;
  if (!/^[a-z0-9-]{1,180}$/.test(req.params.slug) || !availabilityMonths().includes(month) || !validateDays(month, req.body?.days)) return res.status(400).json({ message: "Provide valid availability for this month or next month. Notes must be at most 300 characters." });
  try {
    const track = await Track.findOne({ where: { slug: req.params.slug } });
    if (!track) return res.status(404).json({ message: "Track not found." });
    const [calendar] = await Availability.upsert({ trackId: track.id, month, days: req.body.days }, { conflictFields: ["trackId", "month"] });
    res.json({ month, timeZone, today: currentDate(), days: calendar.days, updatedAt: calendar.updatedAt });
  } catch { res.status(503).json({ message: "Unable to save track availability." }); }
};
