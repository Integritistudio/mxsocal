const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

exports.accountEmail = ({ code, purpose, url }) => {
  const verification = code !== undefined;
  const invitation = purpose === "invite";
  const title = verification ? "Confirm your email." : invitation ? "Your account is ready to set up." : "Choose a new password.";
  const label = verification ? "EMAIL VERIFICATION" : invitation ? "ACCOUNT INVITATION" : "PASSWORD RESET";
  const intro = verification ? "Enter the code below on the verification screen to finish setting up your MXSoCal account." : invitation ? "The MXSoCal team has created an account for you. Set your password to confirm your email and sign in." : "Use the link below to reset your MXSoCal password.";
  const expiry = verification ? "10 minutes" : invitation ? "24 hours" : "15 minutes";
  const safeUrl = escapeHtml(url || "");
  const action = verification
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0 14px;border:1px solid #dedede;background:#f7f7f7"><tr><td align="center" style="padding:24px 8px"><span style="font-family:Consolas,'Courier New',monospace;font-size:34px;line-height:44px;letter-spacing:8px;font-weight:bold;color:#111111">${escapeHtml(code)}</span></td></tr></table>`
    : `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:30px 0 16px"><tr><td bgcolor="#de2321" style="text-align:center"><a href="${safeUrl}" style="display:inline-block;padding:16px 26px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;line-height:20px">${invitation ? "Set up my account" : "Reset my password"}&nbsp; &#8599;</a></td></tr></table>`;
  const safety = verification ? "Keep this code to yourself. MXSoCal will never ask you to share it." : invitation ? "If you weren't expecting this invitation, you can ignore this email." : "Didn't request a reset? Ignore this email. Your password will stay the same.";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#eeeeec;color:#161616;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${verification ? "Confirm your MXSoCal email with your verification code." : title} Valid for ${expiry}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#eeeeec"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="width:100%;max-width:560px">
<tr><td style="padding:28px 28px 24px;border-bottom:3px solid #de2321"><span style="font-family:Arial,Helvetica,sans-serif;font-size:30px;line-height:34px;letter-spacing:-1.5px;font-weight:900;font-style:italic;color:#de2321">MXSoCal</span></td></tr>
<tr><td style="padding:32px 28px 34px"><p style="margin:0 0 16px;color:#bd211f;font-size:10px;line-height:16px;letter-spacing:2px;font-weight:bold">${label}</p><h1 style="margin:0 0 18px;max-width:400px;font-size:30px;line-height:36px;letter-spacing:-.8px;font-weight:700;color:#111111">${title}</h1><p style="margin:0;color:#505050;font-size:15px;line-height:25px">${intro}</p>${action}<p style="margin:0;color:#666666;font-size:12px;line-height:20px">Valid for <strong style="color:#222222">${expiry}</strong>${verification ? "." : " &middot; One use only."}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:30px"><tr><td style="border-top:1px solid #e5e5e5;padding-top:20px"><p style="margin:0;font-size:12px;line-height:21px;color:#777777">${safety}</p>${verification ? '<p style="margin:8px 0 0;font-size:12px;line-height:21px;color:#777777">If you didn\'t create an account, ignore this email.</p>' : `<p style="margin:18px 0 0;color:#777777;font-size:11px;line-height:18px">If the button doesn't open, <a href="${safeUrl}" style="color:#333333;text-decoration:underline">use this link</a> or copy the address below:</p><p style="margin:6px 0 0;font-size:10px;line-height:16px;word-break:break-all;overflow-wrap:anywhere;color:#888888">${safeUrl}</p>`}</td></tr></table></td></tr>
<tr><td bgcolor="#151515" style="padding:18px 28px"><span style="color:#ffffff;font-weight:bold;font-size:12px;line-height:20px">MXSoCal</span><span style="color:#aaaaaa;font-size:11px;line-height:20px">&nbsp; / &nbsp; Account services</span></td></tr>
</table><p style="margin:18px 0 0;color:#888888;font-size:11px;line-height:18px;text-align:center">Sent automatically by MXSoCal. Please don't reply to this email.</p>
</td></tr></table></body></html>`;
};
