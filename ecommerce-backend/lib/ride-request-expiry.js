const { Op } = require("sequelize");
const Request = require("../models/ride-request.model");
const { currentDate } = require("./track-availability");
exports.expireRequests = async ({ userId, now = new Date() } = {}) => Request.update({
  status: "rejected", expiredAt: now, reviewedAt: now,
  adminNote: "Automatically rejected because the first ride day passed before this request was approved.",
}, { where: { status: "requested", startDate: { [Op.lt]: currentDate(now) }, ...(userId ? { userId } : {}) } });
