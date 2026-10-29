const path = require("node:path");
const { randomUUID } = require("node:crypto");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const { accountEmail } = require("../lib/account-email-template");
const { bookingEmail } = require("../lib/booking-email-template");
const { contactEmail } = require("../lib/contact-email-template");
const { rideRequestEmail } = require("../lib/ride-request-email-template");
const { participantEmail, paymentReceiptEmail } = require("../lib/ride-participant-email-template");
const { rejectionEmail } = require("../lib/ride-request-rejection-email");
const { sendAccountMail } = require("../lib/account-mail");

const recipient = process.argv.find(value => value.startsWith("--to="))?.slice(5);
const dryRun = process.argv.includes("--dry-run");
const startAt = Number(process.argv.find(value => value.startsWith("--start="))?.slice(8) || 1);
const demoUrl = "https://example.com/mxsocal-email-preview";
// Preview links never create real accounts, waivers, or checkout sessions.
require("../lib/ride-participant-links").url = () => demoUrl;
const request = {
  id: randomUUID(), status: "requested", startDate: "2026-11-15", endDate: "2026-11-16",
  draft: { coachMode: "group", coachId: "demo-coach", riders: [
    { name: "Ahmad (sample rider)", email: "rider@example.com", phone: "+1 555 010 0100", bikeId: "demo-bike" },
    { name: "Alex (sample buddy)", email: "buddy@example.com", phone: "+1 555 010 0200", bikeId: "demo-bike-2" },
  ] },
  estimate: { track: { name: "Fox Raceway" }, totalAmount: 150000, items: [
    { riderIndex: 0, productId: "demo-bike", image: "/images/bikes/bb11e.png", name: "KTM 300 EXC", dailyAmount: 30000, days: 2, amount: 60000 },
    { riderIndex: 1, productId: "demo-bike-2", image: "/images/bikes/1cc67.png", name: "Honda CRF450R", dailyAmount: 25000, days: 2, amount: 50000 },
    { riderIndex: 1, gearPackage: true, name: "Gear rental package", dailyAmount: 5000, days: 2, amount: 10000 },
    { riderIndex: 1, productId: "helmet", name: "Helmet", size: "M", included: true, amount: 0 },
    { coachId: "demo-coach", name: "Sample group coach", assignmentLabel: "Shared group coach", dailyAmount: 15000, days: 2, amount: 30000 },
  ] },
};
const participant = { id: randomUUID(), requestId: request.id, riderIndex: 0, name: "Ahmad (sample rider)", currency: "usd", amountCents: 90000 };
const contact = { id: "DEMO-INQUIRY", name: "Sample visitor", email: "visitor@example.com", phone: "+1 555 010 0300", topic: "Planning a group ride", message: "Hi MXSoCal!\nWe would love to book a two-day ride with bikes, gear, and a coach. What should we bring?\nThanks!" };
const previews = [
  ["Email verification", { html: accountEmail({ code: "123456" }), text: "Sample verification code: 123456. This code is not valid." }],
  ["Account invitation", { html: accountEmail({ purpose: "invite", url: demoUrl }), text: "Sample account invitation. No account has been created." }],
  ["Password reset", { html: accountEmail({ purpose: "reset", url: demoUrl }), text: "Sample password reset. No password reset has been requested." }],
  ["Booking confirmation", bookingEmail({ user: { name: "Ahmad (sample rider)" }, booking: { id: randomUUID(), bookingDate: "2026-11-15", slots: [{ start: "09:00", end: "16:00" }], totalPrice: 600, notes: "Sample booking notes: arrive 30 minutes early.", meta: { currency: "USD", items: [{ name: "KTM 300 EXC", quantity: 1, unitAmount: 60000 }] } } })],
  ["Contact inquiry", contactEmail({ source: "contact", contact })],
  ["Email signup notification", contactEmail({ source: "footer", contact })],
  ["Ride request — organizer", rideRequestEmail({ request, kind: "owner", riderIndex: 0 })],
  ["Ride request — admin", rideRequestEmail({ request, kind: "admin", riderIndex: 0 })],
  ["Ride request — buddy", rideRequestEmail({ request, kind: "buddy", riderIndex: 1 })],
  ["Sign waiver and pay", participantEmail({ ...request, status: "pending_payment" }, participant)],
  ["Payment receipt", paymentReceiptEmail({ ...request, status: "approved" }, participant, demoUrl)],
  ["Request not approved", rejectionEmail({ ...request, adminNote: "Sample reason: this track is unavailable on the requested dates. Please contact our team to choose another date." }, 0)],
  ["Request expired", rejectionEmail({ ...request, expiredAt: new Date(), adminNote: "Sample reason: the request expired before all riders completed their waivers and payments." }, 0)],
];

(async () => {
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error("Provide a valid --to=email@example.com recipient.");
  const images = await require("../lib/receipt-images").receiptImages(request.estimate.items);
  for (const [index, kind, riderIndex] of [[6, "owner", 0], [7, "admin", 0], [8, "buddy", 1]]) {
    previews[index][1] = { ...rideRequestEmail({ request, kind, riderIndex, images }), attachments: [...images.values()] };
  }
  if (!Number.isInteger(startAt) || startAt < 1 || startAt > previews.length) throw new Error("Invalid preview start number.");
  // Generate and validate every variant before making any deliveries.
  const mails = previews.map(([label, mail], index) => {
    if (!mail.html.includes("<!doctype html>")) throw new Error(`Invalid template: ${label}`);
    const banner = '<div style="padding:14px 20px;background:#241514;color:#ffb8b0;text-align:center;font-family:Arial,sans-serif;font-size:12px;line-height:20px"><strong>TEMPLATE PREVIEW — SAMPLE DATA</strong><br>No real booking or payment. Buttons are demo links. Sample PDF attachments are omitted.</div>';
    const html = mail.html.replace(/<body\b[^>]*>/i, value => value + banner)
      .replace(/href="[^"]*"/g, `href="${demoUrl}"`);
    return { email: recipient, subject: `[MXSoCal REDESIGNED ${index + 1}/${previews.length}] ${label}`, text: `TEMPLATE PREVIEW — SAMPLE DATA. No real booking or payment. Sample PDF attachments are omitted.\n\n${mail.text || label}`, html,
      attachments: mail.attachments || [], label };
  });
  const { emailAttachments } = require("../lib/email-assets");
  for (const mail of mails) {
    const assets = emailAttachments(mail.html, mail.attachments);
    if (!assets.some(asset => asset.cid === "mxsocal-logo@mxsocal")) throw new Error("Preview logo is missing.");
  }
  const previewFile = process.argv.find(value => value.startsWith("--html="))?.slice(7);
  if (previewFile) {
    const fs = require("node:fs");
    const escape = value => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    const pages = mails.map(mail => {
      let html = mail.html;
      for (const asset of emailAttachments(html, mail.attachments)) if (asset.cid) html = html.split(`cid:${asset.cid}`).join(`data:${asset.contentType};base64,${asset.content.toString("base64")}`);
      return `<article hidden><iframe title="${escape(mail.label)}" srcdoc="${escape(html)}" style="width:100%;height:90vh;border:0"></iframe></article>`;
    });
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MXSoCal redesigned emails</title><body style="margin:0;background:#080808;color:#eee;font:14px Arial"><header style="padding:20px;max-width:900px;margin:auto"><h1 style="font-size:22px">MXSoCal email previews</h1><p>Self-contained previews with embedded images. Select any of the 13 templates.</p><select aria-label="Email template" onchange="document.querySelectorAll('article').forEach((page,index)=>page.hidden=index!==this.selectedIndex)" style="padding:12px;background:#171717;color:#fff;border:1px solid #555;border-radius:8px;width:100%">${mails.map(mail => `<option>${escape(mail.label)}</option>`).join("")}</select></header>${pages.join("")}<script>document.querySelector('article').hidden=false</script></body></html>`;
    fs.mkdirSync(path.dirname(path.resolve(previewFile)), { recursive: true });
    fs.writeFileSync(previewFile, html);
    console.log("Saved self-contained HTML previews.");
  }
  if (dryRun) { console.log(`Validated ${mails.length} email previews; no emails sent.`); return; }
  for (const mail of mails.slice(startAt - 1)) {
    await sendAccountMail(mail);
    console.log(`Sent ${mail.label}`);
  }
  console.log(`Sent previews ${startAt} through ${mails.length} to ${recipient}.`);
})().catch(error => { console.error(`Preview send failed: ${error.code || error.name} (${error.command || "template"}). ${error.code === "EAUTH" ? "Email provider authentication failed." : "Check mail configuration and any preceding successful deliveries."}`); process.exitCode = 1; }).finally(() => require("../lib/account-mail").closeMailTransport());
