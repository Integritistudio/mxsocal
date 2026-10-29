const { emailLayout } = require("./email-layout");
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
exports.contactEmail = ({ source, contact }) => {
  const footer = source === "footer";
  const title = footer ? "A new rider is interested." : "You have a new message.";
  const label = footer ? "NEW EMAIL SIGNUP" : "WEBSITE INQUIRY";
  const fields = footer ? [["Email", contact.email]] : [["Name", contact.name], ["Email", contact.email], ["Phone", contact.phone || "Not provided"], ["Topic", contact.topic]];
  const details = fields.map(([label, value]) => `<tr><td style="padding:12px 0;border-bottom:1px solid #333333;width:90px;color:#aaaaaa;font-size:12px;vertical-align:top">${label}</td><td style="padding:12px 0;border-bottom:1px solid #333333;color:#eeeeee;font-size:14px;word-break:break-word">${escapeHtml(value)}</td></tr>`).join("");
  return {
    subject: footer ? "MXSoCal | New email signup" : "MXSoCal | New contact inquiry",
    text: `${title}\n\n${fields.map(([label, value]) => `${label}: ${value}`).join("\n")}${footer ? "" : `\n\nMessage:\n${contact.message}`}\n\nReference: ${contact.id}`,
    html: emailLayout({ title, preheader: title, section: "Admin notifications", rows: `<tr><td class="email-content" style="padding:32px 28px"><p style="margin:0 0 16px;color:#ff9891;font-size:10px;letter-spacing:2px;font-weight:bold">${label}</p><h1 style="margin:0 0 18px;font-size:34px;line-height:40px">${title}</h1><p style="font-size:14px;line-height:24px;color:#bbbbbb">${footer ? "Someone left their email through the website footer or Founder’s Access form. Their details are also available in Dashboard / Email captures." : "A visitor submitted the MXSoCal contact form. Their details and message are below."}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${details}</table>${footer ? "" : `<h2 style="margin:28px 0 12px;font-size:16px">Message</h2><div style="padding:20px;background:#1b1b1b;font-size:14px;line-height:24px;word-break:break-word">${escapeHtml(contact.message).replace(/\r?\n/g, "<br>")}</div>`}<p style="margin:28px 0"><a href="mailto:${escapeHtml(encodeURIComponent(contact.email))}" style="display:inline-block;padding:16px 26px;border-radius:28px;background:#de2321;color:#eeeeee;text-decoration:none;font-size:14px;font-weight:bold">Reply to visitor &#8599;</a></p><p style="font-size:11px;color:#aaaaaa;word-break:break-all">Reference: ${escapeHtml(contact.id)}</p></td></tr>` }),
  };
};
