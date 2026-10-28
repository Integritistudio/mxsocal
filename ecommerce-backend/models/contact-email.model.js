const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
module.exports = sequelize.define("ContactEmail", {
  id: { type: DataTypes.UUID, primaryKey: true },
  source: { type: DataTypes.STRING(20), allowNull: false },
  sentAt: { type: DataTypes.DATE, allowNull: true },
  lockedUntil: { type: DataTypes.DATE, allowNull: true },
  nextAttemptAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { indexes: [{ fields: ["sentAt", "nextAttemptAt"] }] });
