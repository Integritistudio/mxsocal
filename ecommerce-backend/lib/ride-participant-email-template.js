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
exports.paymentReceiptEmail = (request, participant, receiptUrl) => {
  const url = require("./ride-participant-links").url(participant);
  const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: participant.currency }).format(value / 100);
  const items = require("./ride-participant-pricing").riderItems(request, participant.riderIndex);
  const status = request.status === "approved" ? "Everyone has signed and paid. Your group ride is approved." : "Your part is complete. The group is approved once every rider signs and pays. Use your personal link to check the latest status.";
  const details = `${request.estimate.track?.name || "MXSoCal ride"} | ${request.startDate} – ${request.endDate}`;
  const itemLabel = item => `${item.name}${item.size ? ` (Size ${item.size})` : ""}`;
  const itemPrice = item => item.included ? "Included" : money(item.amount);
  return {
    subject: "MXSoCal | Payment received — your receipt and ride details",
    text: `Hi ${participant.name},\n\nPayment received: ${money(participant.amountCents)}\nLiability waiver signed\n\n${details}\n${status}\n\nYour selections:\n${items.map(item => `${itemLabel(item)} — ${itemPrice(item)}`).join("\n")}\n\nView your ride details and status: ${url}${receiptUrl ? `\nStripe payment receipt: ${receiptUrl}` : ""}\n\nKeep your personal link private. No account is needed to view your booking using this link.\nReference: ${request.id}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:28px;color:#171717"><h1>Payment received</h1><p>Hi ${escape(participant.name)}, your payment of <strong>${escape(money(participant.amountCents))}</strong> is complete.</p><p>Liability waiver signed</p><p>${escape(details)}</p><p>${escape(status)}</p><h2>Your ride selections</h2><table style="width:100%;border-collapse:collapse">${items.map(item => `<tr><td style="padding:10px 0;border-bottom:1px solid #ddd">${escape(itemLabel(item))}</td><td style="padding:10px 0;border-bottom:1px solid #ddd;text-align:right">${escape(itemPrice(item))}</td></tr>`).join("")}</table><p style="margin:28px 0"><a href="${escape(url)}" style="display:inline-block;background:#de2321;color:#fff;padding:14px 24px;text-decoration:none">View your ride details &amp; status</a></p>${receiptUrl ? `<p><a href="${escape(receiptUrl)}">View Stripe payment receipt</a></p>` : ""}<p>Keep this personal link private. You can use it to view your booking without creating an account.</p><p>Reference: ${escape(request.id)}</p></div>`,
  };
};
