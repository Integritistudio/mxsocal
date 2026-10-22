const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
module.exports = sequelize.define("TrackAvailability", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  trackId: { type: DataTypes.UUID, allowNull: false, references: { model: "Tracks", key: "id" }, onDelete: "CASCADE" },
  month: { type: DataTypes.STRING(7), allowNull: false },
  days: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
}, { indexes: [{ unique: true, fields: ["trackId", "month"] }] });
