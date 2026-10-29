const { emailLayout } = require("./email-layout");
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
const date = value => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
exports.rideRequestEmail = ({ request, kind, riderIndex, images = new Map() }) => {
  const photo = item => {
    const cid = images.get(item.image)?.cid;
    return cid ? `<td width="76" style="padding:12px 12px 12px 0;vertical-align:middle"><img src="cid:${escapeHtml(cid)}" alt="${escapeHtml(item.name)}" width="68" height="58" style="display:block;object-fit:contain;border-radius:6px;background:#1b1b1b"></td>` : `<td width="76" style="padding:12px 12px 12px 0"><div style="width:68px;height:58px;line-height:58px;text-align:center;background:#1b1b1b;color:#aaaaaa;font-size:10px;border-radius:6px">MXSoCal</div></td>`;
  };
  const buddy = kind === "buddy", admin = kind === "admin";
  const owner = request.draft.riders[0];
  const selected = buddy ? request.draft.riders.map((rider, index) => ({ rider, index })).filter(row => row.index === riderIndex) : request.draft.riders.map((rider, index) => ({ rider, index }));
  if (!selected.length) throw new Error("Email rider is missing.");
  const title = buddy ? "You have been added to an adventure." : admin ? "A new ride request is here." : "Your ride request is received.";
  const intro = buddy ? `${owner.name} added you as a buddy for an MXSoCal adventure. Here are the details selected for you.` : admin ? `${owner.name} submitted a new ride request. Review the group's details in the dashboard.` : `Thanks, ${owner.name}. We have received your ride request. Here are the details for you and your buddies.`;
  const status = request.status === "approved" ? "This ride has been approved." : request.status === "pending_payment" ? "This request is pending payment. Each rider receives a separate personal link to sign their waiver and pay. The group is approved after everyone completes both steps." : request.status === "requested" ? "This is a booking request awaiting admin approval. Equipment is reserved only after review. No payment has been taken." : "This request is now closed. Check with the organizer or MXSoCal for the latest details.";
  const track = request.estimate.track?.name || "MXSoCal will select the best available track for your dates.";
  const sections = selected.map(({ rider, index }) => {
    const items = request.estimate.items.filter(item => item.riderIndex === index && !item.coachId);
    const contact = buddy ? "" : [rider.email, rider.phone].filter(Boolean).join(" / ");
    return { rider, index, contact, items };
  });
  const coaches = request.estimate.items.filter(item => item.coachId && (!buddy || (request.draft.coachMode === "individual" ? item.coachId === selected[0].rider.coachId : item.coachId === request.draft.coachId)));
  const itemText = item => `${item.name}${item.size ? ` / Size ${item.size}` : ""} - ${item.included ? "Included in gear rental" : `${money(item.amount)} (${money(item.dailyAmount)} per day, ${item.days} days)`}`;
  const textSections = sections.map(({ rider, contact, items }) => `${buddy ? "Your selections" : rider.name}${contact ? `\n${contact}` : ""}\n${items.map(itemText).join("\n")}`).join("\n\n");
  const htmlSections = sections.map(({ rider, contact, items }) => `<h2 style="margin:28px 0 8px;font-size:18px">${buddy ? "Your selections" : escapeHtml(rider.name)}</h2>${contact ? `<p style="color:#aaaaaa;font-size:12px;word-break:break-word">${escapeHtml(contact)}</p>` : ""}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items.map(item => `<tr>${photo(item)}<td style="padding:12px 0;border-bottom:1px solid #333333;font-size:14px;line-height:22px">${escapeHtml(item.name)}${item.size ? `<br><small>Size ${escapeHtml(item.size)}</small>` : ""}</td><td align="right" style="padding:12px 0;border-bottom:1px solid #333333;font-size:13px">${item.included ? "Included" : escapeHtml(money(item.amount))}${!item.included ? `<br><small style="color:#aaaaaa">${escapeHtml(money(item.dailyAmount))} / day x ${item.days} days</small>` : ""}</td></tr>`).join("")}</table>`).join("");
  const coachingText = coaches.map(item => `${itemText(item)}${!buddy && item.assignmentLabel ? ` / ${item.assignmentLabel}` : ""}`).join("\n");
  const coachingHtml = coaches.length ? `<h2 style="margin:28px 0 12px;font-size:18px">${buddy ? "Your coaching" : "Coaching"}</h2>${coaches.map(item => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${photo(item)}<td><p style="font-size:14px;line-height:24px">${escapeHtml(item.name)}${!buddy && item.assignmentLabel ? ` - ${escapeHtml(item.assignmentLabel)}` : ""}<br>${escapeHtml(money(item.dailyAmount))} / day${request.draft.coachMode !== "individual" ? " for the whole group" : ""}</p></td></tr></table>`).join("")}` : "";
  const total = buddy ? "" : `<p style="padding-top:20px;border-top:2px solid #eeeeee;font-size:20px;font-weight:bold">Estimated group total: ${escapeHtml(money(request.estimate.totalAmount))}</p>`;
  const base = (process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const url = /^https?:\/\//.test(base) ? base + (admin ? "/bookings" : "/account?tab=bookings") : "";
  const action = !buddy && url ? `<p style="margin:28px 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:16px 26px;border-radius:28px;background:#de2321;color:#eeeeee;text-decoration:none;font-size:14px;font-weight:bold">${admin ? "Review ride request" : "View my bookings"}</a></p>` : "";
  return {
    subject: buddy ? "MXSoCal | You have been added as a ride buddy" : admin ? "MXSoCal | New ride request" : "MXSoCal | Your ride request",
    text: `${title}\n\n${intro}\n\n${status}\n\nDates: ${date(request.startDate)} - ${date(request.endDate)}\nTrack: ${track}\nReference: ${request.id}\n\n${textSections}${coachingText ? `\n\nCoaching:\n${coachingText}` : ""}${!buddy ? `\n\nEstimated group total: ${money(request.estimate.totalAmount)}` : ""}${!buddy && url ? `\n\n${url}` : ""}\n\nQuestions? Contact contact@mxsocal.com.`,
    html: emailLayout({ title, preheader: title, section: "Ride adventures", rows: `<tr><td class="email-content" style="padding:32px 28px"><p style="font-size:10px;letter-spacing:2px;color:#ff9891;font-weight:bold">${buddy ? "BUDDY INVITATION" : "RIDE REQUEST RECEIPT"}</p><h1 style="font-size:34px;line-height:40px">${title}</h1><p style="font-size:15px;line-height:25px">${escapeHtml(intro)}</p><p style="padding:16px;background:#271714;color:#ffb8b0;font-size:13px;line-height:22px">${escapeHtml(status)}</p><p style="font-size:14px;line-height:24px"><strong>Ride dates</strong><br>${date(request.startDate)} - ${date(request.endDate)}<br><strong>Track</strong><br>${escapeHtml(track)}</p>${htmlSections}${coachingHtml}${total}<p style="font-size:12px;color:#aaaaaa">Your itemized PDF receipt is attached. This is an estimate, not proof of payment.</p>${action}<p style="font-size:11px;color:#aaaaaa;word-break:break-all">Reference: ${escapeHtml(request.id)}</p><p style="font-size:12px;color:#bbbbbb">Questions? <a href="mailto:contact@mxsocal.com" style="color:#ff9891">contact@mxsocal.com</a></p></td></tr>` }),
  };
};
