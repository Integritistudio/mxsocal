const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
exports.participantEmail = (request, participant) => {
  const url = require("./ride-participant-links").url(participant);
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: participant.currency }).format(participant.amountCents / 100);
  const intro = `Hi ${participant.name}, your ride request has been reviewed and is pending payment. First sign your own liability waiver, then pay your individual total of ${amount}.`;
  const details = `${request.estimate.track?.name || "MXSoCal ride"} | ${request.startDate} – ${request.endDate}`;
  const note = "Every rider must sign and pay before the group ride is approved. A shared group coach is charged to the booking owner. Keep this personal link private; it can sign and pay only for your rider.";
  return {
    subject: "MXSoCal | Sign your waiver and complete payment",
    text: `${intro}\n\n${details}\n${note}\n\nSign waiver and pay: ${url}\n\nReference: ${request.id}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:28px;color:#171717"><h1>Complete your ride booking</h1><p>${escape(intro)}</p><p>${escape(details)}</p><p>${escape(note)}</p><p style="margin:28px 0"><a href="${escape(url)}" style="background:#de2321;color:white;padding:14px 24px;text-decoration:none">Sign waiver and pay</a></p><p>Reference: ${escape(request.id)}</p></div>`,
  };
};
