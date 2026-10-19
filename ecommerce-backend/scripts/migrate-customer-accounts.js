const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const sequelize = require("../config/database");
sequelize.options.logging = false;
const { DataTypes } = require("sequelize");
const User = require("../models/user.model");
const Challenge = require("../models/email-challenge.model");
const Saved = require("../models/saved-product.model");
(async () => {
  const qi = sequelize.getQueryInterface(); const columns = await qi.describeTable("Users");
  for (const key of ["firstName", "lastName", "dateOfBirth", "gender", "genderDescription", "address", "emailVerifiedAt", "tokenVersion", "avatarData", "avatarContentType"]) {
    if (!columns[key]) { const field = User.rawAttributes[key]; await qi.addColumn("Users", key, { type: field.type, allowNull: field.allowNull, ...(field.defaultValue !== undefined ? { defaultValue: field.defaultValue } : {}) }); }
  }
  await qi.changeColumn("Users", "password", { type: DataTypes.STRING, allowNull: true });
  const reviews = await qi.describeTable("ProductReviews");
  if (!reviews.userId) await qi.addColumn("ProductReviews", "userId", { type: DataTypes.UUID, allowNull: true, references: { model: "Users", key: "id" }, onDelete: "SET NULL" });
  await Challenge.sync(); await Saved.sync();
  console.log("Customer account fields, verification challenges, saved products, and review ownership are ready. Existing users and passwords preserved.");
})().catch(error => { console.error(`Account migration failed (${error.name}).`); process.exitCode = 1; }).finally(() => sequelize.close());
