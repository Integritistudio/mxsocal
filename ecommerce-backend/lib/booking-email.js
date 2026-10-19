const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Email = require("../models/booking-email.model");
const { Booking } = require("../models/booking.model");
const User = require("../models/user.model");
exports.queue = async (bookingId, transaction) => Email.findOrCreate({ where: { bookingId }, transaction });
exports.deliver = async (bookingIds) => {
  const jobs = await sequelize.transaction(async transaction => {
    const rows = await Email.findAll({ where: { ...(bookingIds ? { bookingId: bookingIds } : {}), sentAt: null, nextAttemptAt: { [Op.lte]: new Date() }, [Op.or]: [{ lockedUntil: null }, { lockedUntil: { [Op.lt]: new Date() } }] }, limit: 10, lock: transaction.LOCK.UPDATE, skipLocked: true, transaction });
    for (const row of rows) await row.update({ lockedUntil: new Date(Date.now() + 10 * 60000), attempts: row.attempts + 1 }, { transaction });
    return rows;
  });
  for (const job of jobs) {
    try {
      const booking = await Booking.findByPk(job.bookingId);
      if (!booking) { await job.destroy(); continue; }
      if (booking.paymentStatus !== "paid") { await job.update({ lockedUntil: null, nextAttemptAt: new Date(Date.now() + 3600000) }); continue; }
      const user = await User.findByPk(booking.userId, { attributes: ["name", "email"] });
      const content = require("./booking-email-template").bookingEmail({ booking, user });
      await require("./account-mail").sendAccountMail({ email: user.email, ...content });
      await job.update({ sentAt: new Date(), lockedUntil: null });
    } catch { await job.update({ lockedUntil: null, nextAttemptAt: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(job.attempts, 6))) }); }
  }
};
