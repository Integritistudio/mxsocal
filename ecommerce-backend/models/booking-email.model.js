const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
module.exports = sequelize.define("BookingEmail", {
  bookingId: { type: DataTypes.UUID, primaryKey: true },
  sentAt: { type: DataTypes.DATE, allowNull: true },
  lockedUntil: { type: DataTypes.DATE, allowNull: true },
  nextAttemptAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
});
