const {
  Product,
  BikeSpec,
  HelmetSpec,
  GloveSpec,
  SuitSpec,
  ProductAvailability,
} = require("../models/product.model");
const { Op } = require("sequelize");

exports.createProduct = async (req, res) => {
  try {
    const data = req.body;
    const { bikeSpec, helmetSpec, gloveSpec, suitSpec, availabilities } = data;
    const product = await Product.create(data);
    if (product.category === "bike" && bikeSpec) {
      await BikeSpec.create({ ...bikeSpec, productId: product.id });
    }
    if (product.category === "helmet" && helmetSpec) {
      await HelmetSpec.create({ ...helmetSpec, productId: product.id });
    }
    if (product.category === "gloves" && gloveSpec) {
      await GloveSpec.create({ ...gloveSpec, productId: product.id });
    }
    if (product.category === "suit" && suitSpec) {
      await SuitSpec.create({ ...suitSpec, productId: product.id });
    }
    if (Array.isArray(availabilities) && availabilities.length) {
      const records = availabilities.map((a) => ({
        ...a,
        productId: product.id,
      }));
      await ProductAvailability.bulkCreate(records);
    }
    const created = await Product.findByPk(product.id, {
      include: [
        { model: BikeSpec, as: "bikeSpec" },
        { model: HelmetSpec, as: "helmetSpec" },
        { model: GloveSpec, as: "gloveSpec" },
        { model: SuitSpec, as: "suitSpec" },
        { model: ProductAvailability, as: "availabilities" },
      ],
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const where = {};
    if (req.query.category) where.category = req.query.category;
    const products = await Product.findAll({
      where,
      include: [
        { model: BikeSpec, as: "bikeSpec" },
        { model: HelmetSpec, as: "helmetSpec" },
        { model: GloveSpec, as: "gloveSpec" },
        { model: SuitSpec, as: "suitSpec" },
        { model: ProductAvailability, as: "availabilities" },
      ],
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: BikeSpec, as: "bikeSpec" },
        { model: HelmetSpec, as: "helmetSpec" },
        { model: GloveSpec, as: "gloveSpec" },
        { model: SuitSpec, as: "suitSpec" },
        { model: ProductAvailability, as: "availabilities" },
      ],
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addAvailability = async (req, res) => {
  try {
    const productId = req.params.id;
    const entries = req.body.availabilities;
    if (!Array.isArray(entries))
      return res.status(400).json({ message: "Invalid availabilities" });
    const records = entries.map((a) => ({ ...a, productId }));
    await ProductAvailability.bulkCreate(records);
    const updated = await Product.findByPk(productId, {
      include: [{ model: ProductAvailability, as: "availabilities" }],
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAvailability = async (req, res) => {
  try {
    const productId = req.params.id;
    const { date, weekday } = req.query;
    const where = { productId };
    if (date) where.date = date;
    if (weekday) where.weekday = weekday;
    const avail = await ProductAvailability.findAll({ where });
    res.json(avail);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
