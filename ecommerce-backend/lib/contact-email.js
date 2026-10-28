const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Email = require("../models/contact-email.model");
const Contact = require("../models/contact-message.model");
const Footer = require("../models/footer-contact.model");
exports.queue = (id, source, transaction) => Email.findOrCreate({ where: { id }, defaults: { source }, transaction });
exports.deliver = async () => {
  const recipient = (process.env.ADMIN_EMAIL || "").trim();
  if (recipient.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error("ADMIN_EMAIL is not configured correctly.");
  const jobs = await sequelize.transaction(async transaction => {
    const rows = await Email.findAll({ where: { sentAt: null, nextAttemptAt: { [Op.lte]: new Date() }, [Op.or]: [{ lockedUntil: null }, { lockedUntil: { [Op.lt]: new Date() } }] }, order: [["nextAttemptAt", "ASC"]], limit: 5, lock: transaction.LOCK.UPDATE, skipLocked: true, transaction });
    for (const job of rows) await job.update({ lockedUntil: new Date(Date.now() + 10 * 60000), attempts: job.attempts + 1 }, { transaction });
    return rows;
  });
  for (const job of jobs) {
    try {
      const contact = await (job.source === "footer" ? Footer : Contact).findByPk(job.id);
      if (!contact) { await job.destroy(); continue; }
      const content = require("./contact-email-template").contactEmail({ source: job.source, contact });
      await require("./account-mail").sendAccountMail({ email: recipient, ...content });
      await job.update({ sentAt: new Date(), lockedUntil: null });
    } catch (error) {
      console.error("Admin contact email will retry:", error.name);
      await job.update({ lockedUntil: null, nextAttemptAt: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(job.attempts, 6))) });
    }
  }
};
