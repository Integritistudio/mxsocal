const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const db = require("../config/database");
db.options.logging = false;
async function migrate() {
  const User = require("../models/user.model"); const Coach = require("../models/coach.model");
  const query = db.getQueryInterface();
  for (const [model, field] of [[User, "needsCoach"], [Coach, "dailyRate"]]) {
    const columns = await query.describeTable(model.getTableName());
    if (!columns[field]) {
      try { await query.addColumn(model.getTableName(), field, model.rawAttributes[field]); }
      catch (error) { if (error.original?.code !== "42701") throw error; }
    }
  }
  await require("../models/ride-request.model").sync();
  const Pricing = require("../models/ride-pricing.model");
  await Pricing.sync();
  await Pricing.findOrCreate({ where: { id: "default" } });
  console.log("Ride requests ready. Customers default to needing a coach; set coach daily rates in admin.");
}
migrate().catch(error => { console.error(`Migration failed (${error.name}).`); process.exitCode = 1; }).finally(() => db.close());
