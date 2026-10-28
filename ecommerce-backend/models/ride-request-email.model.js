const { DataTypes } = require("sequelize");
const db = require("../config/database");
module.exports = db.define("RideRequestEmail", {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  requestId: { type: DataTypes.UUID, allowNull: false, references: { model: "RideRequests", key: "id" }, onDelete: "CASCADE" },
  kind: { type: DataTypes.STRING(12), allowNull: false },
  riderIndex: { type: DataTypes.INTEGER, allowNull: false, defaultValue: -1 },
  email: { type: DataTypes.STRING(254), allowNull: true },
  sentAt: { type: DataTypes.DATE, allowNull: true },
  lockedUntil: { type: DataTypes.DATE, allowNull: true },
  nextAttemptAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { indexes: [{ unique: true, fields: ["requestId", "kind", "riderIndex"] }, { fields: ["sentAt", "nextAttemptAt"] }] });
