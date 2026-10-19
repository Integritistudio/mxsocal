const { Op } = require("sequelize");
const sequelize = require("../config/database");
const { Product, BikeSpec, HelmetSpec, GloveSpec, SuitSpec } = require("../models/product.model");
const Review = require("../models/product-review.model");
const ReviewImage = require("../models/review-image.model");
const slugify = require("../helpers/product-slug");
const categories = ["bike", "helmet", "gloves", "suit", "accessory"];
const ratingKeys = ["performance", "handling", "comfort", "condition", "rental", "value"];
const uuid = value => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const text = (value, max = 255) => typeof value === "string" && value.trim().length <= max;
const mediaUrl = value => typeof value === "string" && value.length <= 2000 && (/^\/(?!\/)[^\\\s]*$/.test(value) || /^https:\/\/[^\s]+$/i.test(value));
const mapUrl = value => { try { const url = new URL(value); return url.protocol === "https:" && ["www.google.com", "maps.google.com", "google.com"].includes(url.hostname) && (url.pathname === "/maps" || url.pathname.startsWith("/maps/")); } catch { return false; } };
const pairsValid = rows => Array.isArray(rows) && rows.length <= 40 && rows.every(row => row && text(row.label, 100) && row.label.trim() && text(row.value, 1000));
function detailValid(details) {
  return details && typeof details === "object" && !Array.isArray(details) &&
    ["subtitle", "address", "condition", "videoUrl", "mapEmbedUrl", "brochureUrl", "reportUrl"].every(key => details[key] == null || text(details[key], 2000)) &&
    ["videoUrl", "brochureUrl", "reportUrl"].every(key => !details[key] || mediaUrl(details[key])) && (!details.mapEmbedUrl || mapUrl(details.mapEmbedUrl)) &&
    (!details.gallery || (Array.isArray(details.gallery) && details.gallery.length <= 20 && details.gallery.every(mediaUrl))) && (!details.overview || pairsValid(details.overview)) && (!details.badges || (Array.isArray(details.badges) && details.badges.length <= 8 && details.badges.every(item => text(item, 100)))) &&
    (!details.specifications || (Array.isArray(details.specifications) && details.specifications.length <= 12 && details.specifications.every(group => group && text(group.title, 100) && pairsValid(group.rows))));
}
const productFields = ["name", "slug", "category", "brand", "description", "images", "pricePerHour", "pricePerDay", "pricePerWeek", "currency", "deposit", "location", "available", "status", "attributes", "stockQuantity"];
function validateProduct(body) {
  if (body?.stockQuantity !== undefined && (!Number.isInteger(body.stockQuantity) || body.stockQuantity < 0 || body.stockQuantity > 10000)) return "Stock quantity must be a whole number between 0 and 10,000.";
  if (!body || !text(body.name, 200) || !body.name.trim() || !categories.includes(body.category)) return "Enter a product name and a valid category.";
  if (!slugify(body.slug || body.name)) return "Enter a URL name using letters and numbers.";
  if (!["available", "maintenance", "booked", "inactive"].includes(body.status) || typeof body.available !== "boolean") return "Choose a valid availability status.";
  if (!["brand", "slug", "location"].every(key => body[key] == null || text(body[key])) || !text(body.description || "", 15000) || !/^[A-Z]{3}$/.test(body.currency || "USD")) return "Check the description, currency, and product information.";
  if (!Array.isArray(body.images) || body.images.length > 20 || !body.images.every(mediaUrl)) return "Use up to 20 valid image URLs.";
  if (["pricePerHour", "pricePerDay", "pricePerWeek", "deposit"].some(key => body[key] != null && body[key] !== "" && (!Number.isFinite(Number(body[key])) || Number(body[key]) < 0 || Number(body[key]) > 99999999))) return "Prices must be valid positive amounts.";
  if (!body.attributes || typeof body.attributes !== "object" || Array.isArray(body.attributes) || (body.attributes.details && !detailValid(body.attributes.details))) return "Check the overview, specifications, and media links. Maps must use a Google Maps URL.";
  if (body.attributes.tagline != null && !text(body.attributes.tagline, 500)) return "Keep the tagline under 500 characters.";
  if (body.attributes.features != null && (!Array.isArray(body.attributes.features) || body.attributes.features.length > 3 || !body.attributes.features.every(item => text(item, 100)))) return "Use up to three short product features.";
  if (body.attributes.sizes != null && (!Array.isArray(body.attributes.sizes) || body.attributes.sizes.length > 20 || !body.attributes.sizes.every(size => text(size, 20) && size.trim()))) return "Use up to 20 short gear sizes.";
  if (body.attributes.rentalGroup != null && !["helmet", "suit", "gloves", "boots", "accessory"].includes(body.attributes.rentalGroup)) return "Choose a valid booking category.";
  return null;
}
function cleanDetails(raw = {}) {
  const data = {};
  for (const key of ["subtitle", "address", "condition"]) if (typeof raw[key] === "string") data[key] = raw[key];
  for (const key of ["videoUrl", "brochureUrl", "reportUrl"]) if (mediaUrl(raw[key])) data[key] = raw[key];
  if (mapUrl(raw.mapEmbedUrl)) data.mapEmbedUrl = raw.mapEmbedUrl;
  if (Array.isArray(raw.gallery)) data.gallery = raw.gallery.filter(mediaUrl).slice(0, 20);
  if (pairsValid(raw.overview)) data.overview = raw.overview.map(({ label, value }) => ({ label, value }));
  if (Array.isArray(raw.badges)) data.badges = raw.badges.filter(item => typeof item === "string").slice(0, 8);
  if (Array.isArray(raw.specifications)) data.specifications = raw.specifications.filter(group => group && typeof group.title === "string" && pairsValid(group.rows)).map(({ title, rows }) => ({ title, rows: rows.map(({ label, value }) => ({ label, value })) }));
  return data;
}
function present(product) {
  const p = product.toJSON();
  return { id: p.id, slug: p.slug, name: p.name, category: p.category, brand: p.brand, description: p.description, images: (p.images || []).filter(mediaUrl), pricePerHour: p.pricePerHour, pricePerDay: p.pricePerDay, pricePerWeek: p.pricePerWeek, currency: p.currency, deposit: p.deposit, location: p.location, tagline: p.attributes?.tagline || "", features: Array.isArray(p.attributes?.features) ? p.attributes.features.filter(item => typeof item === "string").slice(0, 3) : [], details: cleanDetails(p.attributes?.details) };
}
const publicReview = row => { const r = row.toJSON(); return { id: r.id, authorName: r.authorName, title: r.title, comment: r.comment, rating: r.rating, ratings: r.ratings, images: r.images.filter(mediaUrl), createdAt: r.createdAt }; };
exports.detail = async (req, res) => {
  if (!/^[a-z0-9-]{1,200}$/i.test(req.params.id)) return res.status(404).json({ message: "Product not found." });
  try {
    const product = await Product.findOne({ where: { ...(uuid(req.params.id) ? { id: req.params.id } : { slug: req.params.id }), available: true, status: "available" } });
    if (!product) return res.status(404).json({ message: "Product not found." });
    const [reviews, related] = await Promise.all([
      Review.findAll({ where: { productId: product.id, status: "approved" }, attributes: { exclude: ["email", "status", "updatedAt", "productId"] }, order: [["createdAt", "DESC"], ["id", "ASC"]] }),
      Product.findAll({ where: { id: { [Op.ne]: product.id }, category: product.category, available: true, status: "available" }, order: [["createdAt", "ASC"]], limit: 8 }),
    ]);
    const averages = Object.fromEntries(ratingKeys.map(key => { const values = reviews.map(r => Number(r.ratings[key])).filter(value => value >= 1 && value <= 5); return [key, values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : 0]; }));
    const ownReviews = req.user ? await Review.findAll({ where: { productId: product.id, userId: req.user.id, status: { [Op.ne]: "approved" } }, attributes: { exclude: ["email"] }, order: [["createdAt", "DESC"]] }) : [];
    res.set({ "Cache-Control": "no-store", Vary: "Cookie" });
    res.json({ myReviews: ownReviews.map(row => ({ ...publicReview(row), status: row.status })), product: present(product), reviews: reviews.map(publicReview), rating: reviews.length ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)) : 0, reviewCount: reviews.length, averages, related: related.map(present) });
  } catch { res.status(503).json({ message: "Product details are temporarily unavailable. Please try again." }); }
};
exports.adminList = async (_req, res) => { try { res.json(await Product.findAll({ order: [["createdAt", "DESC"]] })); } catch { res.status(503).json({ message: "Unable to load products." }); } };
exports.save = async (req, res) => {
  const error = validateProduct(req.body);
  if (error) return res.status(400).json({ message: error });
  if (req.params.id && !uuid(req.params.id)) return res.status(404).json({ message: "Product not found." });
  try {
    const saved = await sequelize.transaction(async transaction => {
      let product = req.params.id ? await Product.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE }) : null;
      if (req.params.id && !product) return null;
      const data = Object.fromEntries(productFields.filter(key => req.body[key] !== undefined).map(key => [key, req.body[key]]));
      for (const key of ["pricePerHour", "pricePerDay", "pricePerWeek", "deposit"]) if (data[key] === "") data[key] = null;
      data.name = data.name.trim();
      data.slug = slugify(data.slug || data.name);
      if (!data.slug) throw new Error("Invalid slug");
      data.attributes = { ...data.attributes, details: cleanDetails(data.attributes.details) };
      product = product ? await product.update(data, { transaction }) : await Product.create(data, { transaction });
        const GearSpec = { helmet: HelmetSpec, gloves: GloveSpec, suit: SuitSpec }[product.category];
        if (GearSpec && Array.isArray(data.attributes.sizes)) {
          const [spec] = await GearSpec.findOrCreate({ where: { productId: product.id }, transaction });
          await spec.update({ sizes: data.attributes.sizes }, { transaction });
        }
      // Keep the listing's engine-size filter in sync with the editable overview.
      if (product.category === "bike") {
        const engine = data.attributes.details.overview?.find(row => /^(engine|engine capacity)$/i.test(row.label))?.value.match(/\d+\s*cc/i)?.[0].replace(/\s/g, "");
        const year = data.attributes.details.overview?.find(row => /^(model year|year)$/i.test(row.label))?.value;
        let spec = await BikeSpec.findOne({ where: { productId: product.id }, transaction });
        if (!spec) spec = await BikeSpec.create({ productId: product.id }, { transaction });
        await spec.update({ ...(engine ? { engineCapacity: engine } : {}), ...(year && /^\d{4}$/.test(year) ? { modelYear: Number(year) } : {}) }, { transaction });
      }
      return product;
    });
    if (!saved) return res.status(404).json({ message: "Product not found." });
    res.status(req.params.id ? 200 : 201).json(saved);
  } catch (failure) { res.status(failure.name === "SequelizeUniqueConstraintError" ? 409 : 503).json({ message: failure.name === "SequelizeUniqueConstraintError" ? "This product URL is already in use. Choose another URL name." : "Unable to save this product. Please check its values and try again." }); }
};
function reviewData(body, admin = false) {
  if (!body || !text(body.authorName, 100) || body.authorName.trim().length < 2 || !text(body.title, 200) || body.title.trim().length < 3 || !text(body.comment, 5000) || body.comment.trim().length < 10) return { error: "Enter your name, a review title (at least 3 characters), and a comment (at least 10 characters)." };
  if ((!admin || body.email) && (typeof body.email !== "string" || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))) return { error: "Enter a valid email address. Your email will remain private." };
  if (!body.ratings || ratingKeys.some(key => !Number.isInteger(body.ratings[key]) || body.ratings[key] < 1 || body.ratings[key] > 5)) return { error: "Choose a rating from 1 to 5 for each category." };
  if (admin && !["pending", "approved", "rejected"].includes(body.status)) return { error: "Choose a valid review status." };
  if (admin && (!Array.isArray(body.images) || body.images.length > 5 || !body.images.every(mediaUrl))) return { error: "Use up to five valid review image URLs." };
  const ratings = Object.fromEntries(ratingKeys.map(key => [key, body.ratings[key]]));
  return { data: { authorName: body.authorName.trim(), email: body.email?.trim() || null, title: body.title.trim(), comment: body.comment.trim(), ratings, rating: Number((Object.values(ratings).reduce((a, b) => a + b, 0) / 6).toFixed(2)), status: admin ? body.status : "pending", images: admin ? body.images : [] } };
}
exports.submitReview = async (req, res) => {
  if (!uuid(req.params.id)) return res.status(404).json({ message: "Product not found." });
  const account = req.account;
  const { data, error } = reviewData({ ...req.body, authorName: account.name, email: account.email });
  if (error) return res.status(400).json({ message: error });
  try {
    const product = await Product.findOne({ where: { id: req.params.id, available: true, status: "available" } });
    if (!product) return res.status(404).json({ message: "Product not found." });
    await sequelize.transaction(async transaction => {
      const review = await Review.create({ ...data, userId: req.user.id, productId: product.id }, { transaction });
      const urls = [];
      for (const image of req.reviewImages || []) {
        const stored = await ReviewImage.create({ ...image, reviewId: review.id }, { transaction });
        urls.push(`/api/review-images/${stored.id}`);
      }
      if (urls.length) await review.update({ images: urls }, { transaction });
    });
    res.status(201).json({ message: "Thank you for sharing your experience." });
  } catch { res.status(503).json({ message: "Unable to submit your review. Please try again." }); }
};
exports.reviewImage = async (req, res) => {
  if (!uuid(req.params.imageId)) return res.status(404).end();
  try {
    const image = await ReviewImage.findByPk(req.params.imageId);
    if (!image) return res.status(404).end();
    const review = await Review.findByPk(image.reviewId, { attributes: ["status", "userId"] });
    if (!review) return res.status(404).end();
    if (review.status !== "approved") {
      const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
      const payload = token && require("../helpers/jwt").verifyToken(token);
      const user = payload && await require("../models/user.model").findByPk(payload.id, { attributes: ["id", "role", "permissions", "tokenVersion", "emailVerifiedAt"] });
      if (!user || (payload.version || 0) !== user.tokenVersion || (user.role === "user" && !user.emailVerifiedAt) || (user.id !== review.userId && !(["admin", "manager"].includes(user.role) && (user.role === "admin" || user.permissions?.includes("product:update"))))) return res.status(404).end();
    }
    res.set({ "Content-Type": image.contentType, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'", "Cache-Control": "no-store", "Content-Disposition": "inline" }).send(image.data);
  } catch { res.status(503).end(); }
};
exports.adminReviews = async (req, res) => {
  if (req.query.productId && !uuid(req.query.productId)) return res.status(400).json({ message: "Choose a valid product." });
  try { res.json(await Review.findAll({ where: req.query.productId ? { productId: req.query.productId } : {}, order: [["createdAt", "DESC"]] })); }
  catch { res.status(503).json({ message: "Unable to load reviews." }); }
};
exports.saveReview = async (req, res) => {
  const { data, error } = reviewData(req.body, true);
  if (error || !uuid(req.body.productId) || (req.params.reviewId && !uuid(req.params.reviewId))) return res.status(400).json({ message: error || "Choose a valid product and review." });
  try {
    if (!await Product.findByPk(req.body.productId)) return res.status(404).json({ message: "Product not found." });
    const review = req.params.reviewId ? await Review.findByPk(req.params.reviewId) : null;
    if (req.params.reviewId && !review) return res.status(404).json({ message: "Review not found." });
    const saved = review ? await review.update({ ...data, productId: req.body.productId }) : await Review.create({ ...data, productId: req.body.productId });
    res.status(review ? 200 : 201).json(saved);
  } catch { res.status(503).json({ message: "Unable to save the review." }); }
};
exports.deleteReview = async (req, res) => {
  if (!uuid(req.params.reviewId)) return res.status(404).json({ message: "Review not found." });
  try { const count = await Review.destroy({ where: { id: req.params.reviewId } }); res.status(count ? 204 : 404).send(); }
  catch { res.status(503).json({ message: "Unable to delete the review." }); }
};
