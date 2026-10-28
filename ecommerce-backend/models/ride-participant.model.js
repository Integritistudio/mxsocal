const { DataTypes } = require("sequelize");
const db = require("../config/database");
const Request = require("./ride-request.model");
const Participant = db.define("RideParticipant", {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  requestId: { type: DataTypes.UUID, allowNull: false, references: { model: "RideRequests", key: "id" }, onDelete: "CASCADE" },
  riderIndex: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(254), allowNull: false },
  amountCents: { type: DataTypes.INTEGER, allowNull: false },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "usd" },
  waiver: { type: DataTypes.JSONB, allowNull: true },
  signedAt: { type: DataTypes.DATE, allowNull: true },
  paidAt: { type: DataTypes.DATE, allowNull: true },
  stripeSessionId: { type: DataTypes.STRING, allowNull: true },
  paymentIntentId: { type: DataTypes.STRING, allowNull: true },
  checkoutAttempt: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  lastLinkSentAt: { type: DataTypes.DATE, allowNull: true },
}, { indexes: [{ unique: true, fields: ["requestId", "riderIndex"] }, { unique: true, fields: ["stripeSessionId"] }] });
Request.hasMany(Participant, { as: "participants", foreignKey: "requestId" });
Participant.belongsTo(Request, { foreignKey: "requestId" });
module.exports = Participant;
