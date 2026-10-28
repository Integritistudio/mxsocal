const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const db = require("../config/database");
db.options.logging = false;
require("../models/ride-request.model");
require("../models/ride-request-email.model").sync().then(() => console.log("Ride request email queue is ready. Existing requests were not emailed.")).catch(error => { console.error("Ride email migration failed:", error.name); process.exitCode = 1; }).finally(() => db.close());
