const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./user.model");
const RideRequest = sequelize.define("RideRequest", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, references: { model: "Users", key: "id" } },
  clientKey: { type: DataTypes.UUID, allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "requested" },
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  endDate: { type: DataTypes.DATEONLY, allowNull: false },
  draft: { type: DataTypes.JSONB, allowNull: false },
  estimate: { type: DataTypes.JSONB, allowNull: false },
  privacyAcceptedAt: { type: DataTypes.DATE, allowNull: false },
  privacyVersion: { type: DataTypes.STRING, allowNull: false, defaultValue: "booking-2026-10" },
  expiredAt: { type: DataTypes.DATE, allowNull: true },
  reviewedBy: { type: DataTypes.UUID, allowNull: true },
  reviewedAt: { type: DataTypes.DATE, allowNull: true },
  adminNote: { type: DataTypes.TEXT, allowNull: true },
}, { indexes: [{ unique: true, fields: ["userId", "clientKey"] }] });
RideRequest.belongsTo(User, { foreignKey: "userId" });
module.exports = RideRequest;
