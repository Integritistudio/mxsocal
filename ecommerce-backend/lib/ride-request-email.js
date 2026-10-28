const { Op } = require("sequelize");
const db = require("../config/database");
const Email = require("../models/ride-request-email.model");
const Request = require("../models/ride-request.model");
exports.queue = async (request, transaction) => {
  const recipients = [{ kind: "admin", riderIndex: -1, email: null }, ...request.draft.riders.map((rider, index) => ({ kind: index === 0 ? "owner" : "buddy", riderIndex: index, email: rider.email }))];
  for (const recipient of recipients) await Email.findOrCreate({ where: { requestId: request.id, kind: recipient.kind, riderIndex: recipient.riderIndex }, defaults: { email: recipient.email }, transaction });
};
exports.deliver = async () => {
  const jobs = await db.transaction(async transaction => {
    const rows = await Email.findAll({ where: { sentAt: null, nextAttemptAt: { [Op.lte]: new Date() }, [Op.or]: [{ lockedUntil: null }, { lockedUntil: { [Op.lt]: new Date() } }] }, order: [["nextAttemptAt", "ASC"], ["id", "ASC"]], limit: 10, lock: transaction.LOCK.UPDATE, skipLocked: true, transaction });
    for (const job of rows) await job.update({ lockedUntil: new Date(Date.now() + 10 * 60000), attempts: job.attempts + 1 }, { transaction });
    return rows;
  });
  for (const job of jobs) {
    try {
      const request = await Request.findByPk(job.requestId);
      if (!request) { await job.destroy(); continue; }
      const email = job.kind === "admin" ? (process.env.ADMIN_EMAIL || "").trim() : job.email;
      if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Notification recipient is invalid.");
      const content = require("./ride-request-email-template").rideRequestEmail({ request, kind: job.kind, riderIndex: job.riderIndex });
      await require("./account-mail").sendAccountMail({ email, ...content });
      await job.update({ sentAt: new Date(), lockedUntil: null });
    } catch (error) {
      console.error("Ride request email will retry:", error.name);
      await job.update({ lockedUntil: null, nextAttemptAt: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(job.attempts, 6))) });
    }
  }
};
