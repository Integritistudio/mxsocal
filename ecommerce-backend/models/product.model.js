const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Product = sequelize.define(
  "Product",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    stockQuantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 0, max: 10000 } },
    slug: { type: DataTypes.STRING, allowNull: true },
    category: {
      type: DataTypes.ENUM("bike", "helmet", "gloves", "suit", "accessory"),
      allowNull: false,
    },
    brand: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    images: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
    pricePerHour: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    pricePerDay: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    pricePerWeek: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    currency: { type: DataTypes.STRING, defaultValue: "USD" },
    deposit: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    location: { type: DataTypes.STRING, allowNull: true },
    available: { type: DataTypes.BOOLEAN, defaultValue: true },
    status: {
      type: DataTypes.ENUM("available", "maintenance", "booked", "inactive"),
      defaultValue: "available",
    },
    attributes: { type: DataTypes.JSONB, allowNull: true },
  },
  {
    timestamps: true,
    indexes: [{ name: "products_public_slug_unique", unique: true, fields: ["slug"] }],
    hooks: { beforeValidate: product => { if (!product.slug && product.name) product.slug = require("../helpers/product-slug")(product.name); } },
  }
);

const BikeSpec = sequelize.define(
  "BikeSpec",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: { type: DataTypes.UUID, allowNull: false },
    model: { type: DataTypes.STRING, allowNull: true },
    modelYear: { type: DataTypes.INTEGER, allowNull: true },
    engineCapacity: { type: DataTypes.STRING, allowNull: true },
    transmission: { type: DataTypes.STRING, allowNull: true },
    fuelType: { type: DataTypes.STRING, allowNull: true },
    mileage: { type: DataTypes.STRING, allowNull: true },
    seatHeight: { type: DataTypes.FLOAT, allowNull: true },
    weight: { type: DataTypes.FLOAT, allowNull: true },
    colors: { type: DataTypes.JSONB, allowNull: true },
    numberOfGears: { type: DataTypes.INTEGER, allowNull: true },
    topSpeed: { type: DataTypes.INTEGER, allowNull: true },
    fuelTankCapacity: { type: DataTypes.FLOAT, allowNull: true },
    registrationNumber: { type: DataTypes.STRING, allowNull: true },
    extras: { type: DataTypes.JSONB, allowNull: true },
  },
  { timestamps: false }
);

const HelmetSpec = sequelize.define(
  "HelmetSpec",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: { type: DataTypes.UUID, allowNull: false },
    sizes: { type: DataTypes.JSONB, allowNull: true },
    material: { type: DataTypes.STRING, allowNull: true },
    safetyStandards: { type: DataTypes.JSONB, allowNull: true },
    weightGrams: { type: DataTypes.INTEGER, allowNull: true },
    visorIncluded: { type: DataTypes.BOOLEAN, defaultValue: false },
    ventilation: { type: DataTypes.BOOLEAN, defaultValue: false },
    colors: { type: DataTypes.JSONB, allowNull: true },
    extras: { type: DataTypes.JSONB, allowNull: true },
  },
  { timestamps: false }
);

const GloveSpec = sequelize.define(
  "GloveSpec",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: { type: DataTypes.UUID, allowNull: false },
    sizes: { type: DataTypes.JSONB, allowNull: true },
    material: { type: DataTypes.STRING, allowNull: true },
    palmProtection: { type: DataTypes.BOOLEAN, defaultValue: false },
    waterproof: { type: DataTypes.BOOLEAN, defaultValue: false },
    touchscreenCompatible: { type: DataTypes.BOOLEAN, defaultValue: false },
    reinforcedKnuckles: { type: DataTypes.BOOLEAN, defaultValue: false },
    colors: { type: DataTypes.JSONB, allowNull: true },
    extras: { type: DataTypes.JSONB, allowNull: true },
  },
  { timestamps: false }
);

const SuitSpec = sequelize.define(
  "SuitSpec",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: { type: DataTypes.UUID, allowNull: false },
    sizes: { type: DataTypes.JSONB, allowNull: true },
    material: { type: DataTypes.STRING, allowNull: true },
    waterproof: { type: DataTypes.BOOLEAN, defaultValue: false },
    thermalInsulation: { type: DataTypes.BOOLEAN, defaultValue: false },
    armorIncluded: { type: DataTypes.BOOLEAN, defaultValue: false },
    season: { type: DataTypes.STRING, allowNull: true },
    colors: { type: DataTypes.JSONB, allowNull: true },
    extras: { type: DataTypes.JSONB, allowNull: true },
  },
  { timestamps: false }
);

Product.hasOne(BikeSpec, {
  foreignKey: "productId",
  as: "bikeSpec",
  onDelete: "CASCADE",
});
BikeSpec.belongsTo(Product, { foreignKey: "productId" });

Product.hasOne(HelmetSpec, {
  foreignKey: "productId",
  as: "helmetSpec",
  onDelete: "CASCADE",
});
HelmetSpec.belongsTo(Product, { foreignKey: "productId" });

Product.hasOne(GloveSpec, {
  foreignKey: "productId",
  as: "gloveSpec",
  onDelete: "CASCADE",
});
GloveSpec.belongsTo(Product, { foreignKey: "productId" });

Product.hasOne(SuitSpec, {
  foreignKey: "productId",
  as: "suitSpec",
  onDelete: "CASCADE",
});
SuitSpec.belongsTo(Product, { foreignKey: "productId" });

const ProductAvailability = sequelize.define(
  "ProductAvailability",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: { type: DataTypes.UUID, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: true },
    weekday: { type: DataTypes.SMALLINT, allowNull: true },
    isRecurring: { type: DataTypes.BOOLEAN, defaultValue: false },
    slots: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    note: { type: DataTypes.STRING, allowNull: true },
  },
  { timestamps: true }
);

Product.hasMany(ProductAvailability, {
  foreignKey: "productId",
  as: "availabilities",
  onDelete: "CASCADE",
});
ProductAvailability.belongsTo(Product, { foreignKey: "productId" });

module.exports = {
  Product,
  BikeSpec,
  HelmetSpec,
  GloveSpec,
  SuitSpec,
  ProductAvailability,
};
