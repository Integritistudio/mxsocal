const { Op } = require("sequelize");
const db = require("../config/database");
const Email = require("../models/ride-request-email.model");
const Request = require("../models/ride-request.model");
exports.queue = async (request, transaction) => {
  const recipients = [{ kind: "admin", riderIndex: -1, email: null }, ...request.draft.riders.map((rider, index) => ({ kind: index === 0 ? "owner" : "buddy", riderIndex: index, email: rider.email }))];
  for (const recipient of recipients) await Email.findOrCreate({ where: { requestId: request.id, kind: recipient.kind, riderIndex: recipient.riderIndex }, defaults: { email: recipient.email }, transaction });
};
exports.queueParticipant = async (participant, transaction, resend = false) => {
  const [job] = await Email.findOrCreate({ where: { requestId: participant.requestId, kind: "checkout", riderIndex: participant.riderIndex }, defaults: { email: participant.email }, transaction });
  if (resend) {
    await job.reload({ transaction, lock: transaction.LOCK.UPDATE });
    if (job.lockedUntil && new Date(job.lockedUntil).getTime() > Date.now()) { const error = new Error("This email is already being sent. Try again shortly."); error.status = 429; throw error; }
    await job.update({ sentAt: null, nextAttemptAt: new Date(), attempts: 0 }, { transaction });
  }
  await participant.update({ lastLinkSentAt: new Date() }, { transaction });
};
exports.queuePaymentReceipt = async (participant, transaction) => {
  await Email.findOrCreate({ where: { requestId: participant.requestId, kind: "paid", riderIndex: participant.riderIndex }, defaults: { email: participant.email }, transaction });
};
exports.queueRejection = async (request, transaction) => {
  for (const [riderIndex, rider] of request.draft.riders.entries()) {
    await Email.findOrCreate({ where: { requestId: request.id, kind: "rejected", riderIndex }, defaults: { email: rider.email }, transaction });
  }
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
      if (job.kind === "rejected") {
        if (request.status !== "rejected") { await job.update({ sentAt: new Date(), lockedUntil: null }); continue; }
        await require("./account-mail").sendAccountMail({ email: job.email, ...require("./ride-request-rejection-email").rejectionEmail(request, job.riderIndex) });
        await job.update({ sentAt: new Date(), lockedUntil: null });
        continue;
      }
      if (job.kind === "paid") {
        const participant = await require("../models/ride-participant.model").findOne({ where: { requestId: request.id, riderIndex: job.riderIndex } });
        if (!participant?.paidAt) throw new Error("Payment receipt requires a paid rider.");
        const receiptUrl = await require("./ride-participant-checkout").receiptUrl(participant);
        await require("./account-mail").sendAccountMail({ email: participant.email, ...require("./ride-participant-email-template").paymentReceiptEmail(request, participant, receiptUrl) });
        await job.update({ sentAt: new Date(), lockedUntil: null });
        continue;
      }
      if (job.kind === "checkout") {
        const participant = await require("../models/ride-participant.model").findOne({ where: { requestId: request.id, riderIndex: job.riderIndex } });
        if (request.status !== "pending_payment" || !participant || participant.paidAt) { await job.update({ sentAt: new Date(), lockedUntil: null }); continue; }
        await require("./account-mail").sendAccountMail({ email: participant.email, ...require("./ride-participant-email-template").participantEmail(request, participant) });
        await job.update({ sentAt: new Date(), lockedUntil: null });
        continue;
      }
      const email = job.kind === "admin" ? (process.env.ADMIN_EMAIL || "").trim() : job.email;
      if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Notification recipient is invalid.");
      const context = { request, kind: job.kind, riderIndex: job.riderIndex };
      const view = require("./ride-receipt-data").receiptData(context);
      const images = await require("./receipt-images").receiptImages(view.items);
      const content = require("./ride-request-email-template").rideRequestEmail({ ...context, images });
      const pdf = await require("./ride-receipt-pdf").receiptPdf({ ...context, images });
      const attachments = [...images.values(), { filename: `MXSoCal-receipt-${request.id.slice(0, 8)}${job.kind === "buddy" ? `-buddy-${job.riderIndex}` : ""}.pdf`, content: pdf, contentType: "application/pdf" }];
      await require("./account-mail").sendAccountMail({ email, ...content, attachments });
      await job.update({ sentAt: new Date(), lockedUntil: null });
    } catch (error) {
      console.error("Ride request email will retry:", error.name);
      await job.update({ lockedUntil: null, nextAttemptAt: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(job.attempts, 6))) });
    }
  }
};
