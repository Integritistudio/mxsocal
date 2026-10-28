const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
exports.rejectionEmail = (request, riderIndex) => {
  const rider = request.draft.riders[riderIndex];
  if (!rider) throw new Error("Rejection email rider is missing.");
  const title = request.expiredAt ? "Your ride request has expired" : "Your ride request was not approved";
  const reason = request.adminNote?.trim() || "We are unable to accommodate this ride request. Please contact us if you would like help choosing different dates or equipment.";
  const details = `${request.estimate.track?.name || "MXSoCal ride"} | ${request.startDate} – ${request.endDate}`;
  const origin = new URL(process.env.FRONTEND_URL || "http://localhost:3000").origin;
  const url = riderIndex === 0 ? `${origin}/account?tab=bookings` : `${origin}/contact-us`;
  const action = riderIndex === 0 ? "View my bookings" : "Contact MXSoCal";
  return {
    subject: `MXSoCal | ${request.expiredAt ? "Ride request expired" : "Ride request not approved"}`,
    text: `Hi ${rider.name},\n\n${title}.\n${details}\n\nReason: ${reason}\n\nNo payment is required for this request. You can contact MXSoCal to discuss another ride.\n\n${action}: ${url}\nReference: ${request.id}\nQuestions: contact@mxsocal.com`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:28px;color:#171717"><h1>${escape(title)}</h1><p>Hi ${escape(rider.name)},</p><p>${escape(details)}</p><p style="padding:16px;background:#faf0ef;line-height:1.8;white-space:pre-wrap"><strong>Reason</strong><br>${escape(reason)}</p><p>No payment is required for this request. You can contact MXSoCal to discuss another ride.</p><p style="margin:28px 0"><a href="${escape(url)}" style="display:inline-block;background:#de2321;color:#fff;padding:14px 24px;text-decoration:none">${action}</a></p><p>Reference: ${escape(request.id)}</p><p>Questions? <a href="mailto:contact@mxsocal.com">contact@mxsocal.com</a></p></div>`,
  };
};
