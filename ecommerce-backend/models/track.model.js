const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
module.exports = sequelize.define("Track", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  slug: { type: DataTypes.STRING, allowNull: false, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  city: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.STRING, allowNull: false },
  tagline: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  website: { type: DataTypes.STRING, allowNull: false },
  images: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  layouts: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  features: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  imageSource: { type: DataTypes.STRING, allowNull: false },
  displayOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { timestamps: true });
