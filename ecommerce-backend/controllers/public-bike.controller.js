const { Op } = require("sequelize");
const { Product, BikeSpec } = require("../models/product.model");
const visible = { category: "bike", available: true, status: "available" };
const attributes = ["id", "name", "slug", "brand", "description", "images", "pricePerDay", "currency", "location", "attributes", "createdAt"];
const specAttributes = ["model", "modelYear", "engineCapacity", "transmission", "fuelType", "seatHeight", "weight", "numberOfGears"];
const include = [{ model: BikeSpec, as: "bikeSpec", attributes: specAttributes }];
function present(row) {
  const bike = row.toJSON();
  return {
    id: bike.id, name: bike.name, slug: bike.slug, brand: bike.brand, description: bike.description,
    images: Array.isArray(bike.images) ? bike.images.filter(image => typeof image === "string") : [],
    pricePerDay: bike.pricePerDay, currency: bike.currency,
    tagline: typeof bike.attributes?.tagline === "string" ? bike.attributes.tagline : bike.description,
    features: Array.isArray(bike.attributes?.features) ? bike.attributes.features.filter(item => typeof item === "string").slice(0, 3) : [],
    bikeSpec: bike.bikeSpec,
  };
}
exports.list = async (req, res) => {
  const { brand = "", size = "", budget = "", search = "", page = "1" } = req.query;
  if (Object.keys(req.query).some(key => !["brand", "size", "budget", "search", "page"].includes(key)) || [brand, size, budget, search, page].some(value => typeof value !== "string") || brand.length > 80 || size.length > 30 || search.length > 100 || !/^[1-9]\d{0,3}$/.test(page) || (budget && !/^[1-9]\d{0,4}$/.test(budget))) return res.status(400).json({ message: "Please select valid bike filters." });
  try {
    const where = { ...visible };
    if (brand) where.brand = brand;
    if (budget) where.pricePerDay = { [Op.lte]: Number(budget) };
    if (search.trim()) where.name = { [Op.iLike]: `%${search.trim().replace(/[\\%_]/g, "\\$&")}%` };
    const bikeInclude = [{ ...include[0], ...(size ? { where: { engineCapacity: size }, required: true } : {}) }];
    const offset = (Number(page) - 1) * 4;
    const [{ rows, count }, all] = await Promise.all([
      Product.findAndCountAll({ where, attributes, include: bikeInclude, distinct: true, order: [["createdAt", "ASC"], ["id", "ASC"]], limit: 4, offset }),
      Product.findAll({ where: visible, attributes: ["brand"], include: [{ model: BikeSpec, as: "bikeSpec", attributes: ["engineCapacity"] }] }),
    ]);
    res.json({ bikes: rows.map(present), total: count, totalBikes: all.length, hasMore: offset + rows.length < count,
      brands: [...new Set(all.map(bike => bike.brand).filter(Boolean))].sort(),
      sizes: [...new Set(all.map(bike => bike.bikeSpec?.engineCapacity).filter(Boolean))].sort((a, b) => parseFloat(a) - parseFloat(b)),
    });
  } catch { res.status(503).json({ message: "Bikes are temporarily unavailable. Please try again shortly." }); }
};
exports.detail = async (req, res) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id)) return res.status(404).json({ message: "Bike not found." });
  try {
    const bike = await Product.findOne({ where: { ...visible, id: req.params.id }, attributes, include });
    if (!bike) return res.status(404).json({ message: "Bike not found." });
    res.json(present(bike));
  } catch { res.status(503).json({ message: "Bike details are temporarily unavailable." }); }
};
