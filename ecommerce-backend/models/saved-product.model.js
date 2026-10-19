const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./user.model");
const { Product } = require("./product.model");
module.exports = sequelize.define("SavedProduct", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, references: { model: User, key: "id" }, onDelete: "CASCADE" },
  productId: { type: DataTypes.UUID, allowNull: false, references: { model: Product, key: "id" }, onDelete: "CASCADE" },
}, { indexes: [{ unique: true, fields: ["userId", "productId"] }] });
