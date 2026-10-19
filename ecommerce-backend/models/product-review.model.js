const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const { Product } = require("./product.model");
const ProductReview = sequelize.define("ProductReview", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  productId: { type: DataTypes.UUID, allowNull: false, references: { model: Product, key: "id" }, onDelete: "CASCADE" },
  userId: { type: DataTypes.UUID, allowNull: true, references: { model: "Users", key: "id" }, onDelete: "SET NULL" },
  authorName: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: true },
  title: { type: DataTypes.STRING, allowNull: false },
  comment: { type: DataTypes.TEXT, allowNull: false },
  rating: { type: DataTypes.FLOAT, allowNull: false, validate: { min: 1, max: 5 } },
  ratings: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  images: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  status: { type: DataTypes.ENUM("pending", "approved", "rejected"), allowNull: false, defaultValue: "pending" },
}, { indexes: [{ fields: ["productId", "status", "createdAt"] }] });
module.exports = ProductReview;
