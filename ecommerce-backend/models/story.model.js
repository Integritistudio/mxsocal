const { DataTypes } = require('sequelize');
const db = require('../config/database');
module.exports = db.define('Story', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  title: { type: DataTypes.STRING(160), allowNull: false },
  slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
  excerpt: { type: DataTypes.STRING(400), allowNull: false, defaultValue: '' },
  category: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'Riding Guides' },
  author: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'MXSoCal Editorial' },
  coverImage: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
  coverAlt: { type: DataTypes.STRING(200), allowNull: false, defaultValue: '' },
  content: { type: DataTypes.JSONB, allowNull: false, defaultValue: { type: 'doc', content: [{ type: 'paragraph' }] } },
  status: { type: DataTypes.ENUM('draft', 'published'), allowNull: false, defaultValue: 'draft' },
  featured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  seoTitle: { type: DataTypes.STRING(70), allowNull: false, defaultValue: '' },
  seoDescription: { type: DataTypes.STRING(170), allowNull: false, defaultValue: '' },
  publishedAt: { type: DataTypes.DATE, allowNull: true },
}, { timestamps: true, indexes: [{ fields: ['status', 'publishedAt'] }] });
