const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./user.model");
const { Product } = require("./product.model");

const Booking = sequelize.define(
  "Booking",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: { type: DataTypes.UUID, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: false },
    bookingDate: { type: DataTypes.DATEONLY, allowNull: false },
    slots: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    durationHours: { type: DataTypes.INTEGER, allowNull: true },
    accessories: { type: DataTypes.JSONB, allowNull: true },
    totalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    depositPaid: { type: DataTypes.BOOLEAN, defaultValue: false },
    paymentStatus: {
      type: DataTypes.ENUM("pending", "paid", "failed"),
      defaultValue: "pending",
    },
    status: {
      type: DataTypes.ENUM("pending", "confirmed", "cancelled", "completed"),
      defaultValue: "pending",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    meta: { type: DataTypes.JSONB, allowNull: true },
  },
  { timestamps: true }
);

const BookingAccessory = sequelize.define(
  "BookingAccessory",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bookingId: { type: DataTypes.UUID, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: false },
    size: { type: DataTypes.STRING, allowNull: true },
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  },
  { timestamps: false }
);

Booking.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Booking, { foreignKey: "userId" });

Booking.belongsTo(Product, { foreignKey: "productId" });
Product.hasMany(Booking, { foreignKey: "productId" });

Booking.hasMany(BookingAccessory, {
  foreignKey: "bookingId",
  as: "accessoryItems",
  onDelete: "CASCADE",
});
BookingAccessory.belongsTo(Booking, { foreignKey: "bookingId" });

BookingAccessory.belongsTo(Product, { foreignKey: "productId", as: "product" });

module.exports = { Booking, BookingAccessory };
