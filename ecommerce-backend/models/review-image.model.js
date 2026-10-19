const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Review = require("./product-review.model");
module.exports = sequelize.define("ReviewImage", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  reviewId: { type: DataTypes.UUID, allowNull: false, references: { model: Review, key: "id" }, onDelete: "CASCADE" },
  contentType: { type: DataTypes.STRING, allowNull: false },
  data: { type: DataTypes.BLOB, allowNull: false },
}, { indexes: [{ fields: ["reviewId"] }] });
