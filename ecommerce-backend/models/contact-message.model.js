const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

module.exports = sequelize.define("ContactMessage", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(254), allowNull: false },
  phone: { type: DataTypes.STRING(30), allowNull: true },
  topic: { type: DataTypes.STRING(100), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
}, { timestamps: true });
