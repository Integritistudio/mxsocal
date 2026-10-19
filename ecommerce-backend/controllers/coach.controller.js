const Coach = require("../models/coach.model");
const { Op } = require("sequelize");

// Deliberately exclude email, phone, address, and uploaded documents.
const publicAttributes = ["id", "firstName", "lastName", "bio", "profileImage", "experience", "specialty", "experienceLabel", "skills", "coachingLevels", "hourlyRate", "imagePresentation"];
exports.getPublicCoaches = async (req, res) => {
  const { level = "", specialty = "", budget = "", page = "1" } = req.query;
  if (Object.keys(req.query).some(key => !["level", "specialty", "budget", "page"].includes(key)) || [level, specialty, budget, page].some(value => typeof value !== "string") || !/^[1-9]\d{0,3}$/.test(page) || specialty.length > 100 || (level && !["Beginner", "Intermediate", "Advanced"].includes(level)) || (budget && (!/^\d{1,5}$/.test(budget) || Number(budget) <= 0))) {
    return res.status(400).json({ message: "Please select valid coach filters." });
  }
  try {
    const where = {};
    if (level) where.coachingLevels = { [Op.contains]: [level] };
    if (specialty) where.specialty = specialty;
    if (budget) where.hourlyRate = { [Op.lte]: Number(budget) };
    const limit = 4;
    const offset = (Number(page) - 1) * limit;
    const [{ rows, count }, options, totalCoaches] = await Promise.all([
      Coach.findAndCountAll({ where, attributes: publicAttributes, order: [["displayOrder", "ASC"], ["createdAt", "ASC"], ["id", "ASC"]], limit, offset }),
      Coach.findAll({ attributes: ["specialty"], group: ["specialty"], order: [["specialty", "ASC"]] }),
      Coach.count(),
    ]);
    res.json({ coaches: rows, total: count, totalCoaches, hasMore: offset + rows.length < count, specialties: options.map(item => item.specialty).filter(Boolean) });
  } catch {
    res.status(503).json({ message: "Coaches are temporarily unavailable. Please try again shortly." });
  }
};

function coachFields(body) {
  const data = {};
  for (const [key, max] of Object.entries({ firstName: 100, lastName: 100, email: 254, phone: 25, country: 100, state: 100, city: 100, zipCode: 20, bio: 4000, specialty: 100, experienceLabel: 255, profileImage: 255, linkedin: 255, facebook: 255, instagram: 255, xcom: 255 })) {
    if (body[key] === undefined) continue;
    if (typeof body[key] !== "string" || body[key].length > max) throw new Error(`Check ${key} (maximum ${max} characters).`);
    data[key] = body[key].trim();
    if (["firstName", "lastName", "email"].includes(key) && !data[key]) throw new Error(`${key} is required.`);
  }
  if (data.email) { data.email = data.email.toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error("Enter a valid email address."); }
  for (const key of ["profileImage", "linkedin", "facebook", "instagram", "xcom"]) if (data[key] && !/^https?:\/\//i.test(data[key]) && !(key === "profileImage" && /^\/(?!\/)[^\\]+$/.test(data[key]))) throw new Error(`Enter a valid URL for ${key}.`);
  for (const [key, max] of Object.entries({ experience: 100, hourlyRate: 99999999, displayOrder: 100000 })) if (body[key] !== undefined) {
    const value = body[key] === "" || body[key] === null ? null : Number(body[key]);
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > max || (key !== "hourlyRate" && !Number.isInteger(value)))) throw new Error(`Enter a valid ${key}.`);
    data[key] = value ?? (key === "displayOrder" ? 0 : null);
  }
  for (const key of ["skills", "coachingLevels"]) if (body[key] !== undefined) {
    if (!Array.isArray(body[key]) || body[key].length > 20 || !body[key].every(value => typeof value === "string" && value.trim() && value.length <= 200)) throw new Error(`Enter valid ${key}.`);
    data[key] = [...new Set(body[key].map(value => value.trim()))];
  }
  if (data.coachingLevels?.some(value => !["Beginner", "Intermediate", "Advanced"].includes(value))) throw new Error("Choose Beginner, Intermediate, or Advanced coaching levels.");
  if (body.imagePresentation !== undefined) {
    const image = body.imagePresentation;
    if (image !== null && (typeof image !== "object" || !Number.isFinite(image.height) || !Number.isFinite(image.top) || image.height < 100 || image.height > 250 || image.top < -100 || image.top > 0.1)) throw new Error("Check the photo crop settings.");
    data.imagePresentation = image === null ? null : { height: image.height, top: image.top };
  }
  return data;
}

exports.addCoach = async (req, res) => {
  try {
    const data = coachFields(req.body || {});
    if (!data.firstName || !data.lastName || !data.email) return res.status(400).json({ message: "First name, last name, and email are required." });
    const { email } = data;
    const exists = await Coach.findOne({ where: { email } });
    if (exists)
      return res.status(409).json({ message: "Coach already exists" });
    const coach = await Coach.create(data);
    res.status(201).json(coach);
  } catch (err) {
    res.status(err.name === "SequelizeUniqueConstraintError" ? 409 : 400).json({ message: err.name === "SequelizeUniqueConstraintError" ? "A coach with this email already exists." : err.message });
  }
};

exports.getCoaches = async (req, res) => {
  try {
    const coaches = await Coach.findAll({});
    res.json(coaches);
  } catch (err) {
    res.status(err.name === "SequelizeUniqueConstraintError" ? 409 : 400).json({ message: err.name === "SequelizeUniqueConstraintError" ? "A coach with this email already exists." : err.message });
  }
};

exports.getCoachById = async (req, res) => {
  try {
    const coach = await Coach.findByPk(req.params.id);
    if (!coach) return res.status(404).json({ message: "Coach not found" });
    res.json(coach);
  } catch (err) {
    res.status(err.name === "SequelizeUniqueConstraintError" ? 409 : 400).json({ message: err.name === "SequelizeUniqueConstraintError" ? "A coach with this email already exists." : err.message });
  }
};

exports.updateCoach = async (req, res) => {
  try {
    const data = coachFields(req.body || {});

    const coach = await Coach.findByPk(req.params.id);
    if (!coach) return res.status(404).json({ message: "Coach not found" });

    await coach.update(data);

    res.json({ message: "Coach updated", coach: coach.toJSON() });
  } catch (err) {
    res.status(err.name === "SequelizeUniqueConstraintError" ? 409 : 400).json({ message: err.name === "SequelizeUniqueConstraintError" ? "A coach with this email already exists." : err.message });
  }
};

exports.deleteCoach = async (req, res) => {
  try {
    const coach = await Coach.findByPk(req.params.id);
    if (!coach) return res.status(404).json({ message: "Coach not found" });

    await coach.destroy();
    res.json({ message: "Coach deleted" });
  } catch (err) {
    res.status(err.name === "SequelizeUniqueConstraintError" ? 409 : 400).json({ message: err.name === "SequelizeUniqueConstraintError" ? "A coach with this email already exists." : err.message });
  }
};
