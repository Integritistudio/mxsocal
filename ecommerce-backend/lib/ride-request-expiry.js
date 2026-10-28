const { Op } = require("sequelize");
const Request = require("../models/ride-request.model");
const db = require("../config/database");
const { currentDate } = require("./track-availability");
exports.expireRequests = async ({ userId, now = new Date() } = {}) => db.transaction(async transaction => {
  const [count, requests] = await Request.update({
  status: "rejected", expiredAt: now, reviewedAt: now,
  adminNote: "Automatically rejected because the first ride day passed before this request was approved.",
  }, { where: { status: "requested", startDate: { [Op.lt]: currentDate(now) }, ...(userId ? { userId } : {}) }, returning: true, transaction });
  for (const request of requests) await require("./ride-request-email").queueRejection(request, transaction);
  return [count];
});
