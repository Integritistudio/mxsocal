const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const sequelize = require("../config/database");
sequelize.options.logging = false;
const FooterContact = require("../models/footer-contact.model");
FooterContact.sync().then(() => console.log("Footer contacts table is ready.")).catch(error => { console.error("Footer contacts migration failed:", error.name); process.exitCode = 1; }).finally(() => sequelize.close());
