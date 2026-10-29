const test = require("node:test");
const assert = require("node:assert/strict");
const { emailLayout } = require("../lib/email-layout");
const { accountEmail } = require("../lib/account-email-template");
const { bookingEmail } = require("../lib/booking-email-template");

test("email branding embeds images independently of the website and escapes metadata", () => {
  const previous = process.env.FRONTEND_URL;
  try {
    process.env.FRONTEND_URL = "https://rides.example.com/some-path";
    const html = emailLayout({ title: "<Example>", section: "A & B", content: "<p>Message</p>" });
    assert.ok(html.includes('src="cid:mxsocal-logo@mxsocal"'));
    assert.ok(html.includes('src="cid:mxsocal-ride@mxsocal"'));
    assert.ok(html.includes('href="https://rides.example.com/bikes"'));
    assert.ok(html.includes('alt="MXSoCal Rentals and Experiences"'));
    assert.ok(html.includes("&lt;Example&gt;"));
    assert.ok(html.includes("A &amp; B"));
    assert.ok(html.includes("<p>Message</p>"));
    process.env.FRONTEND_URL = "javascript:alert(1)";
    assert.ok(!emailLayout({ title: "Test", content: "" }).includes("javascript:"));
  } finally {
    if (previous === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = previous;
  }
});

test("account variants retain codes, expiry, and escaped action links in the branded shell", () => {
  const verification = accountEmail({ code: "123456" });
  assert.ok(verification.includes("123456"));
  assert.ok(verification.includes("10 minutes"));
  for (const purpose of ["invite", "reset"]) {
    const html = accountEmail({ purpose, url: "https://example.com/action?a=1&b=2" });
    assert.ok(html.includes('href="https://example.com/action?a=1&amp;b=2"'));
    assert.ok(html.includes(purpose === "invite" ? "24 hours" : "15 minutes"));
    assert.equal((html.match(/<!doctype html>/g) || []).length, 1);
    assert.ok(html.includes("cid:mxsocal-logo@mxsocal"));
    assert.ok(!html.includes("cid:mxsocal-ride@mxsocal"));
  }
});

test("booking confirmation retains itemization and payment details in the shared layout", () => {
  const mail = bookingEmail({ user: { name: "<Rider>" }, booking: {
    id: "booking-reference", bookingDate: "2026-11-15", slots: [{ start: "09:00", end: "12:00" }],
    totalPrice: 150, notes: "Bring water\nArrive early", meta: { currency: "USD", items: [{ name: "KTM 300", quantity: 1, unitAmount: 15000 }] },
  } });
  for (const value of ["KTM 300", "$150.00", "Total paid", "Bring water<br>Arrive early", "&lt;Rider&gt;", "cid:mxsocal-logo@mxsocal"]) assert.ok(mail.html.includes(value), value);
  assert.ok(mail.text.includes("TOTAL PAID: $150.00"));
  assert.equal((mail.html.match(/<!doctype html>/g) || []).length, 1);
});

test("every branded image has an inline MIME part and existing receipt attachments survive", async () => {
  const { emailAttachments } = require("../lib/email-assets");
  const MailComposer = require("nodemailer/lib/mail-composer");
  const html = emailLayout({ title: "Ride preview", content: "<h1>Your next ride.</h1>" });
  const pdf = { filename: "receipt.pdf", content: Buffer.from("%PDF-sample"), contentType: "application/pdf" };
  const attachments = emailAttachments(html, [pdf]);
  assert.equal(attachments.length, 3);
  assert.equal(emailAttachments(html, attachments).length, 3);
  for (const cid of [...html.matchAll(/src="cid:([^"]+)"/g)].map(match => match[1])) {
    const image = attachments.find(item => item.cid === cid);
    assert.ok(image); assert.ok(image.content.length > 1000); assert.equal(image.contentDisposition, "inline");
  }
  const raw = (await new MailComposer({ from: "sender@example.com", to: "recipient@example.com", subject: "Preview", html, attachments, disableFileAccess: true, disableUrlAccess: true }).compile().build()).toString();
  assert.ok(raw.includes("Content-ID: <mxsocal-logo@mxsocal>"));
  assert.ok(raw.includes("Content-ID: <mxsocal-ride@mxsocal>"));
  assert.ok(raw.includes("application/pdf")); assert.ok(raw.includes("multipart/related"));
  assert.equal(emailAttachments(accountEmail({ code: "123456" })).length, 1);
});
