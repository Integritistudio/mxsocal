const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
module.exports = sequelize.define("FooterContact", {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
}, { timestamps: true });
