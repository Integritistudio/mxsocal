const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Coach = sequelize.define(
  "Coach",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    zipCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    linkedin: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    facebook: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    instagram: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    xcom: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    experience: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    specialty: { type: DataTypes.STRING, allowNull: true },
    experienceLabel: { type: DataTypes.STRING, allowNull: true },
    skills: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    coachingLevels: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    hourlyRate: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    displayOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    imagePresentation: { type: DataTypes.JSONB, allowNull: true },
    documents: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
  },
  { timestamps: true }
);

module.exports = Coach;
