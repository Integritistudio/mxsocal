const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
module.exports = sequelize.define("EmailChallenge", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email: { type: DataTypes.STRING, allowNull: false },
  purpose: { type: DataTypes.STRING, allowNull: false },
  payload: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  secretHash: { type: DataTypes.STRING, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  consumedAt: { type: DataTypes.DATE, allowNull: true },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { indexes: [{ fields: ["email", "purpose", "createdAt"] }] });
