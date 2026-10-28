const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const db = require("../config/database");
db.options.logging = false;
async function migrate() {
  const { Op } = require("sequelize");
  const Request = require("../models/ride-request.model");
  const Participant = require("../models/ride-participant.model");
  const { Booking } = require("../models/booking.model");
  await Participant.sync();
  await require("../models/ride-request-email.model").sync();
  console.log("Ride participant waiver and payment tables are ready.");
  if (!process.argv.includes("--include-existing")) return;
  const rows = await Request.findAll({ where: { status: "approved", startDate: { [Op.gte]: require("../lib/track-availability").currentDate() } } });
  let converted = 0;
  for (const row of rows) await db.transaction(async transaction => {
    const request = await Request.findByPk(row.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (request.status !== "approved" || await Participant.count({ where: { requestId: request.id }, transaction })) return;
    const where = { meta: { [Op.contains]: { requestId: request.id } } };
    if (await Booking.count({ where: { ...where, paymentStatus: "paid" }, transaction })) return;
    await require("../lib/ride-participant-checkout").initialize(request, transaction);
    await request.update({ status: "pending_payment" }, { transaction });
    await Booking.update({ status: "pending" }, { where: { ...where, status: "confirmed" }, transaction });
    converted++;
  });
  console.log(`Moved ${converted} future unpaid legacy rides to pending payment and queued their personal links.`);
}
migrate().catch(error => { console.error("Ride participant migration failed:", error.name); process.exitCode = 1; }).finally(() => db.close());
