const nodemailer = require("nodemailer");
const { SESClient, SendEmailCommand, SendRawEmailCommand } = require("@aws-sdk/client-ses");
// Tests can replace this exported function with an in-memory delivery sink. Never log codes or reset links.
exports.sendAccountMail = async ({ email, subject, text, html, attachments = [] }) => {
  const from = process.env.MAIL_FROM || process.env.SMTP_FROM || process.env.SES_FROM_EMAIL || process.env.AWS_SES_FROM_EMAIL;
  if (!from) throw new Error("Account email sender is not configured.");
  if (process.env.SMTP_HOST) {
    const host = process.env.SMTP_HOST.trim();
    const configuredPassword = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || "";
    // Google displays app passwords in groups; spaces are not part of the password.
    const password = host.toLowerCase() === "smtp.gmail.com" ? configuredPassword.replace(/\s/g, "") : configuredPassword;
    const transport = nodemailer.createTransport({ host, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === "true", connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: password } } : {}) });
    await transport.sendMail({ from, to: email, subject, text, html, attachments, disableFileAccess: true, disableUrlAccess: true });
  } else {
    const client = new SESClient({ region: process.env.AWS_REGION, ...(process.env.AWS_ACCESS_KEY_ID ? { credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } } : {}) });
    if (attachments.length) {
      const MailComposer = require("nodemailer/lib/mail-composer");
      const raw = await new MailComposer({ from, to: email, subject, text, html, attachments, disableFileAccess: true, disableUrlAccess: true }).compile().build();
      await client.send(new SendRawEmailCommand({ Source: from, Destinations: [email], RawMessage: { Data: raw } }));
      return;
    }
    await client.send(new SendEmailCommand({ Source: from, Destination: { ToAddresses: [email] }, Message: { Subject: { Data: subject, Charset: "UTF-8" }, Body: { Text: { Data: text, Charset: "UTF-8" }, ...(html ? { Html: { Data: html, Charset: "UTF-8" } } : {}) } } }));
  }
};
