const PDFDocument = require("pdfkit");
const { receiptData } = require("./ride-receipt-data");
const money = cents => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const date = value => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
exports.receiptPdf = async ({ request, kind, riderIndex, images = new Map() }) => {
  const view = receiptData({ request, kind, riderIndex });
  const doc = new PDFDocument({ size: "A4", margins: { top: 48, bottom: 58, left: 44, right: 44 }, bufferPages: true, info: { Title: "MXSoCal Ride Request Receipt", Author: "MXSoCal" } });
  const chunks = [];
  const complete = new Promise((resolve, reject) => { doc.on("data", chunk => chunks.push(chunk)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  const width = doc.page.width - 88;
  const clean = value => String(value ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/[^\x20-\x7e]/g, "-");
  const room = height => { if (doc.y + height > doc.page.height - 70) { doc.addPage(); doc.y = 54; } };
  const paragraph = (text, size = 10, color = "#555555") => {
    doc.font("Helvetica").fontSize(size).fillColor(color);
    const safe = clean(text); const height = doc.heightOfString(safe, { width, lineGap: 3 }); room(height + 12);
    doc.text(safe, 44, doc.y, { width, lineGap: 3 }); doc.moveDown(.7);
  };
  doc.font("Helvetica-BoldOblique").fontSize(29).fillColor("#de2321").text("MXSoCal", 44, 42);
  doc.moveTo(44, 85).lineTo(doc.page.width - 44, 85).lineWidth(3).strokeColor("#de2321").stroke(); doc.y = 105;
  doc.font("Helvetica-Bold").fontSize(24).fillColor("#171717").text("Ride request receipt", 44, doc.y, { width }); doc.moveDown(.4);
  paragraph(`Reference: ${request.id}`, 9);
  paragraph(request.status === "approved" ? "APPROVED" : request.status === "pending_payment" ? "PENDING PAYMENT - Each rider signs and pays individually" : request.status === "requested" ? "AWAITING APPROVAL - No payment taken" : "REQUEST CLOSED", 10, "#b52320");
  if (view.buddy) paragraph(`${request.draft.riders[0].name} added you as a buddy for an MXSoCal adventure. This receipt includes only your selections.`);
  paragraph(`Ride dates: ${date(request.startDate)} - ${date(request.endDate)} | ${request.estimate.dates?.length || request.estimate.items[0]?.days || 0} days`, 11, "#222222");
  paragraph(`Track: ${request.estimate.track?.name || "MXSoCal will select the best available track for your dates."}`);
  const heading = label => { room(160); doc.moveDown(.5); doc.font("Helvetica-Bold").fontSize(14).fillColor("#222222").text(clean(label), 44, doc.y, { width }); doc.moveDown(.5); };
  const row = item => {
    const label = clean(item.name); const detail = clean(item.size ? `Size ${item.size}` : item.assignmentLabel || "");
    doc.font("Helvetica-Bold").fontSize(10);
    const labelHeight = doc.heightOfString(label, { width: width - 188 });
    const detailHeight = detail ? doc.font("Helvetica").fontSize(9).heightOfString(detail, { width: width - 188 }) + 5 : 0;
    const height = Math.max(82, labelHeight + detailHeight + 36);
    room(height); const y = doc.y;
    doc.roundedRect(44, y, 70, 58, 5).fill("#f4f4f4");
    const image = images.get(item.image);
    if (image) doc.image(image.content, 47, y + 3, { fit: [64, 52], align: "center", valign: "center" });
    else doc.font("Helvetica").fontSize(8).fillColor("#888888").text("MXSoCal", 47, y + 23, { width: 64, align: "center" });
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#222222").text(label, 128, y + 4, { width: width - 188 });
    if (detail) doc.font("Helvetica").fontSize(9).fillColor("#666666").text(detail, 128, doc.y + 5, { width: width - 188 });
    const price = item.included ? "Included" : money(item.amount);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#222222").text(price, 44 + width - 100, y + 5, { width: 100, align: "right" });
    if (!item.included) doc.font("Helvetica").fontSize(8).fillColor("#777777").text(`${money(item.dailyAmount)} / day x ${item.days}`, 44 + width - 116, y + 23, { width: 116, align: "right" });
    doc.moveTo(44, y + height - 10).lineTo(44 + width, y + height - 10).lineWidth(.5).strokeColor("#dddddd").stroke(); doc.y = y + height;
  };
  for (const section of view.sections) { heading(section.name); if (section.contact) paragraph(section.contact, 9); section.items.forEach(row); }
  if (view.coaches.length) { heading(view.buddy ? "Your coaching" : "Coaching"); view.coaches.forEach(row); }
  room(110);
  const total = view.buddy ? view.sections.flatMap(section => section.items).filter(item => !item.included).reduce((sum, item) => sum + item.amount, 0) : request.estimate.totalAmount;
  doc.moveDown(.6); doc.font("Helvetica-Bold").fontSize(16).fillColor("#222222").text(`${view.buddy ? "Your equipment estimate" : "Estimated group total"}: ${money(total)}`, 44, doc.y, { width }); doc.moveDown(.5);
  if (view.buddy && view.coaches.length) paragraph("Coaching is listed separately above. A group coach rate applies to the whole group.", 9);
  paragraph("This document records the ride request and estimated costs. It is not proof of payment. Equipment is reserved only after admin approval.", 9);
  const pages = doc.bufferedPageRange();
  for (let index = pages.start; index < pages.start + pages.count; index++) {
    doc.switchToPage(index); doc.save(); doc.page.margins.bottom = 0;
    doc.font("Helvetica").fontSize(8).fillColor("#888888").text(`MXSoCal | contact@mxsocal.com`, 44, doc.page.height - 35, { width: width - 80 });
    doc.text(`${index + 1} / ${pages.count}`, 44 + width - 70, doc.page.height - 35, { width: 70, align: "right" }); doc.restore();
  }
  doc.end(); return complete;
};
