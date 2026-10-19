const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM(
        "booking_request",
        "booking_cancel",
        "booking_complete",
        "payment",
        "other"
      ),
      allowNull: false,
    },
    message: { type: DataTypes.TEXT, allowNull: false },
    actorId: { type: DataTypes.UUID, allowNull: true },
    bookingId: { type: DataTypes.UUID, allowNull: true },
    data: { type: DataTypes.JSONB, allowNull: true },
    read: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { timestamps: true }
);

module.exports = Notification;
