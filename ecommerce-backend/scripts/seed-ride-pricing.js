const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const db = require("../config/database"); db.options.logging = false;
const Coach = require("../models/coach.model");
const Pricing = require("../models/ride-pricing.model");
// Starter daily rates authorized by the store owner. Preserve later admin edits.
const rates = [["Alex", "Rider", "150.00"], ["Jake", "Thompson", "250.00"], ["Marcus", "Rivera", "225.00"], ["Liam", "Carter", "300.00"], ["Ethan", "Walker", "175.00"], ["Owen", "Reed", "225.00"], ["Noah", "Brooks", "275.00"]];
async function seed() {
  await db.transaction(async transaction => {
    const [pricing] = await Pricing.findOrCreate({ where: { id: "default" }, transaction });
    if (pricing.gearDailyRate == null) await pricing.update({ gearDailyRate: "50.00" }, { transaction });
    for (const [firstName, lastName, dailyRate] of rates) await Coach.update({ dailyRate }, { where: { firstName, lastName, dailyRate: null }, transaction });
  });
  console.log("Starter daily rates set: gear $50 per rider; individual coach rates $150–$300 per day. Existing prices preserved.");
}
seed().catch(error => { console.error(`Pricing seed failed (${error.name}).`); process.exitCode = 1; }).finally(() => db.close());
