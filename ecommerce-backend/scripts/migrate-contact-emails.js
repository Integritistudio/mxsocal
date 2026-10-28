const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const sequelize = require("../config/database");
sequelize.options.logging = false;
require("../models/contact-email.model").sync().then(() => console.log("Admin contact email queue is ready.")).catch(error => { console.error("Contact email migration failed:", error.name); process.exitCode = 1; }).finally(() => sequelize.close());
