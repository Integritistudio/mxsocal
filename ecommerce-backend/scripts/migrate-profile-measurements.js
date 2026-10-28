const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const sequelize = require("../config/database");
const User = require("../models/user.model");
sequelize.options.logging = false;
(async () => {
  await sequelize.transaction(async transaction => {
    const qi = sequelize.getQueryInterface();
    const columns = await qi.describeTable("Users", { transaction });
    for (const key of ["heightCm", "weightKg"]) if (!columns[key]) await qi.addColumn("Users", key, { type: User.rawAttributes[key].type, allowNull: true }, { transaction });
  });
  console.log("Optional height (cm) and weight (kg) profile columns are ready.");
})().catch(error => { console.error("Profile migration failed:", error.name); process.exitCode = 1; }).finally(() => sequelize.close());
