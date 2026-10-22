const { DataTypes } = require("sequelize");
const db = require("../config/database");
module.exports = db.define("RidePricing", {
  id: { type: DataTypes.STRING(30), primaryKey: true },
  gearDailyRate: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
}, { timestamps: true });
