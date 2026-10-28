const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const db = require("../config/database");
db.options.logging = false;
const Request = require("../models/ride-request.model");
(async () => {
  const qi = db.getQueryInterface();
  const columns = await qi.describeTable("RideRequests");
  if (!columns.expiredAt) await qi.addColumn("RideRequests", "expiredAt", { type: Request.rawAttributes.expiredAt.type, allowNull: true });
  const [count] = await require("../lib/ride-request-expiry").expireRequests();
  console.log(`Expiry field ready. Automatically rejected ${count} expired requests.`);
})().catch(error => { console.error("Ride expiry migration failed:", error.name); process.exitCode = 1; }).finally(() => db.close());
