const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
module.exports = sequelize.define("ResourceAvailability", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  resourceType: { type: DataTypes.STRING(10), allowNull: false },
  resourceId: { type: DataTypes.UUID, allowNull: false },
  month: { type: DataTypes.STRING(7), allowNull: false },
  repeatMonthly: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  days: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
}, { indexes: [{ name: "rental_resource_month_unique", unique: true, fields: ["resourceType", "resourceId", "month", "repeatMonthly"] }] });
