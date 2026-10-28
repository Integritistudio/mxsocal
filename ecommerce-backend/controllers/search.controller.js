const { Op, fn, col, where } = require("sequelize");
const { Product } = require("../models/product.model");
const Coach = require("../models/coach.model");
const Track = require("../models/track.model");
const Story = require("../models/story.model");

exports.search = async (req, res) => {
  const { q = "", page = "1" } = req.query;
  if (typeof q !== "string" || q.length > 100 || typeof page !== "string" || !/^[1-9]\d{0,3}$/.test(page)) {
    return res.status(400).json({ message: "Enter a search of 100 characters or fewer." });
  }
  if (!q.trim()) return res.json({ groups: [], hasMore: false });
  const match = { [Op.iLike]: `%${q.trim().replace(/[\\%_]/g, "\\$&")}%` };
  const limit = 8, offset = (Number(page) - 1) * limit;
  try {
    const definitions = [
      { label: "Bikes", model: Product, where: { category: "bike", available: true, status: "available", name: match }, attributes: ["id", "name", "slug", "images"], image: r => Array.isArray(r.images) ? r.images.find(image => typeof image === "string" && image.trim()) || null : null, title: r => r.name, href: r => `/bikes/${encodeURIComponent(r.slug || r.id)}` },
      { label: "Coaches", model: Coach, where: where(fn("concat", col("firstName"), " ", col("lastName")), match), attributes: ["id", "firstName", "lastName", "profileImage"], image: r => r.profileImage || null, title: r => `${r.firstName} ${r.lastName}`, href: r => `/coaches/${encodeURIComponent(r.id)}` },
      { label: "Tracks", model: Track, where: { name: match }, attributes: ["id", "name", "slug"], title: r => r.name, href: r => `/tracks/${encodeURIComponent(r.slug)}` },
      { label: "Blogs", model: Story, where: { status: "published", publishedAt: { [Op.lte]: new Date() }, title: match }, attributes: ["id", "title", "slug", "coverImage"], image: r => r.coverImage || null, title: r => r.title, href: r => `/stories/${encodeURIComponent(r.slug)}` },
    ];
    const groups = await Promise.all(definitions.map(async definition => {
      const { rows, count } = await definition.model.findAndCountAll({ where: definition.where, attributes: definition.attributes, order: [[definition.attributes[1], "ASC"], ["id", "ASC"]], limit, offset });
      return { label: definition.label, total: count, hasMore: offset + rows.length < count, results: rows.map(row => ({ id: row.id, title: definition.title(row), href: definition.href(row), image: definition.image?.(row) || null })) };
    }));
    return res.json({ groups, hasMore: groups.some(group => group.hasMore) });
  } catch {
    return res.status(503).json({ message: "Search is temporarily unavailable. Please try again." });
  }
};
