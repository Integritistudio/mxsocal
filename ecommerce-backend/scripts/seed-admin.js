const path = require("node:path");
const { randomBytes } = require("node:crypto");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });

const sequelize = require("../config/database");
const User = require("../models/user.model");

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || "admin@mxsocal.com").trim().toLowerCase();
  const name = process.env.ADMIN_NAME || "Platform Admin";
  const password = process.env.ADMIN_PASSWORD || `Aa1!${randomBytes(18).toString("base64url")}`;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("ADMIN_EMAIL must be a valid email address.");
  }
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters and at most 72 bytes.");
  }

  await sequelize.authenticate();
  const [user, created] = await User.findOrCreate({
    where: { email },
    defaults: { name, password, role: "admin", permissions: [] },
  });

  if (!created) {
    if (user.role !== "admin") {
      throw new Error("An account with that email already exists and is not an admin. No changes made.");
    }
    console.log(`Admin already exists: ${email}. Password unchanged.`);
    return;
  }

  const saved = await User.findByPk(user.id);
  if (saved.role !== "admin" || !(await saved.comparePassword(password))) {
    throw new Error("Admin was created, but credential verification failed.");
  }
  console.log(`Admin created and credentials verified.\nEmail: ${email}\nPassword: ${password}`);
}

seedAdmin()
  .catch((error) => {
    console.error(`Admin seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
