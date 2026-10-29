const { currentDate } = require("./track-availability");
const DAY = 86400000;
const addDays = (date, days) => new Date(Date.parse(`${date}T12:00:00Z`) + days * DAY).toISOString().slice(0, 10);
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const sum = (rows, field) => rows.reduce((total, row) => total + number(row[field]), 0);
const countBy = (rows, key) => {
  const counts = new Map();
  for (const row of rows) { const label = String(key(row) || "Unknown"); counts.set(label, (counts.get(label) || 0) + 1); }
  return [...counts].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
};
function analyticsRange(query, now = new Date()) {
  const today = currentDate(now);
  const days = query.days === undefined ? 30 : Number(query.days);
  if (![7, 30, 90, 365].includes(days)) throw new Error("Choose a supported date range.");
  const valid = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
  const end = query.end || today, start = query.start || addDays(end, 1 - days);
  if (!valid(start) || !valid(end) || start > end || end > today) throw new Error("Choose valid dates ending today or earlier.");
  const length = Math.round((Date.parse(end) - Date.parse(start)) / DAY) + 1;
  if (length > 366) throw new Error("Choose a date range of up to 366 days.");
  return { start, end, days: length, previousStart: addDays(start, -length), previousEnd: addDays(start, -1), today };
}
function summarizeAnalytics(data, range) {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" });
  const hourFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", hourCycle: "h23" });
  const dateCache = new Map();
  const eventDate = value => {
    if (!value) return "";
    const key = String(value);
    if (!dateCache.has(key)) {
      const parts = formatter.formatToParts(new Date(value));
      dateCache.set(key, ["year", "month", "day"].map(type => parts.find(part => part.type === type).value).join("-"));
    }
    return dateCache.get(key);
  };
  const inPeriod = (value, start = range.start, end = range.end) => { const date = eventDate(value); return date >= start && date <= end; };
  const current = rows => rows.filter(row => inPeriod(row.createdAt));
  const requests = current(data.requests), customers = current(data.customers), reviews = current(data.reviews);
  const requestsById = new Map(requests.map(row => [row.id, row]));
  const participants = data.participants.filter(row => requestsById.has(row.requestId));
  const usd = row => String(row.currency || "usd").toLowerCase() === "usd";
  const legacy = data.bookings.filter(row => row.meta?.source !== "ride-request" && usd(row.meta || {}));
  const payments = data.participants.filter(row => row.paidAt && usd(row)).map(row => ({ date: row.paidAt, amount: number(row.amountCents) / 100, source: "Ride payments" }));
  // Legacy bookings have no paidAt column. Their last update is an explicit proxy.
  payments.push(...legacy.filter(row => row.paymentStatus === "paid").map(row => ({ date: row.updatedAt, amount: number(row.totalPrice), source: "Legacy rentals" })));
  const metrics = (start, end) => {
    const rides = data.requests.filter(row => inPeriod(row.createdAt, start, end));
    const paid = payments.filter(row => inPeriod(row.date, start, end));
    const revenue = Math.round(sum(paid, "amount") * 100) / 100;
    return { revenue, requests: rides.length, riders: rides.reduce((total, row) => total + (row.draft?.riders?.length || 0), 0), customers: data.customers.filter(row => inPeriod(row.createdAt, start, end)).length, payments: paid.length, averagePayment: paid.length ? Math.round(revenue / paid.length * 100) / 100 : 0, approvalRate: rides.length ? rides.filter(row => row.status === "approved").length / rides.length * 100 : 0 };
  };
  const dates = Array.from({ length: range.days }, (_, index) => addDays(range.start, index));
  const timeline = dates.map(date => ({ date, revenue: 0, requests: 0, riders: 0, customers: 0, inquiries: 0, signups: 0 }));
  const byDate = new Map(timeline.map(row => [row.date, row]));
  for (const payment of payments) { const day = byDate.get(eventDate(payment.date)); if (day) day.revenue += payment.amount; }
  for (const day of timeline) day.revenue = Math.round(day.revenue * 100) / 100;
  for (const request of requests) { const day = byDate.get(eventDate(request.createdAt)); if (day) { day.requests++; day.riders += request.draft?.riders?.length || 0; } }
  for (const [rows, key] of [[customers, "customers"], [current(data.contacts), "inquiries"], [current(data.signups), "signups"]]) for (const row of rows) { const day = byDate.get(eventDate(row.createdAt)); if (day) day[key]++; }
  const riders = requests.flatMap(row => row.draft?.riders || []);
  const products = new Map(data.products.map(row => [row.id, row]));
  const coaches = new Map(data.coaches.map(row => [row.id, `${row.firstName} ${row.lastName}`]));
  const itemTotals = new Map();
  for (const request of requests.filter(row => usd(row.estimate || {}))) for (const item of request.estimate?.items || []) {
    if (item.included) continue;
    const label = item.coachId ? "Coaching" : item.gearPackage ? "Gear rental" : products.get(item.productId)?.category === "bike" ? "Bikes" : "Other equipment";
    itemTotals.set(label, (itemTotals.get(label) || 0) + number(item.amount) / 100);
  }
  const requestOwners = countBy(requests, row => row.userId);
  const leadTimes = ["0–7 days", "8–14 days", "15–30 days", "31–60 days", "61+ days"].map(label => ({ label, value: 0 }));
  const durations = ["2 days", "3 days", "4 days", "5+ days"].map(label => ({ label, value: 0 }));
  const heatmap = Array.from({ length: 7 }, (_, weekday) => ({ name: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][weekday], data: Array.from({ length: 6 }, (_, block) => ({ x: `${String(block * 4).padStart(2, "0")}:00`, y: 0 })) }));
  for (const request of requests) {
    const length = Math.max(1, Math.round((Date.parse(request.endDate) - Date.parse(request.startDate)) / DAY) + 1);
    durations[Math.min(3, Math.max(0, length - 2))].value++;
    const lead = Math.max(0, Math.round((Date.parse(request.startDate) - Date.parse(eventDate(request.createdAt))) / DAY));
    leadTimes[lead <= 7 ? 0 : lead <= 14 ? 1 : lead <= 30 ? 2 : lead <= 60 ? 3 : 4].value++;
    const date = eventDate(request.createdAt), weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const hour = Number(hourFormatter.format(new Date(request.createdAt)));
    heatmap[weekday].data[Math.floor(hour / 4)].y++;
  }
  const outstanding = participants.filter(row => !row.paidAt && usd(row) && requestsById.get(row.requestId)?.status === "pending_payment");
  return {
    range, generatedAt: new Date().toISOString(), timeZone: "America/Los_Angeles", currency: "USD",
    metrics: metrics(range.start, range.end), previous: metrics(range.previousStart, range.previousEnd), timeline,
    statuses: countBy(requests, row => row.expiredAt ? "Expired" : ({ requested: "Awaiting review", pending_payment: "Awaiting payment", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled" })[row.status] || row.status),
    pipeline: [{ label: "Requests", value: requests.length }, { label: "Reviewed", value: requests.filter(row => row.reviewedAt || ["pending_payment", "approved", "rejected"].includes(row.status)).length }, { label: "Accepted", value: requests.filter(row => ["pending_payment", "approved"].includes(row.status)).length }, { label: "Approved", value: requests.filter(row => row.status === "approved").length }],
    riderProgress: [{ label: "Invited", value: participants.length }, { label: "Waiver signed", value: participants.filter(row => row.signedAt).length }, { label: "Paid", value: participants.filter(row => row.paidAt).length }],
    groupSizes: countBy(requests, row => `${row.draft?.riders?.length || 1} rider${row.draft?.riders?.length === 1 ? "" : "s"}`),
    bikes: countBy(riders.filter(row => row.bikeId), row => products.get(row.bikeId)?.name || "Archived bike").slice(0, 10),
    tracks: countBy(requests, row => row.estimate?.track?.name || "MXSoCal arranges track").slice(0, 8),
    coaches: countBy(requests.flatMap(row => row.draft?.coachMode === "individual" ? (row.draft?.riders || []).filter(r => r.coachId).map(r => ({ id: r.coachId })) : row.draft?.coachId ? [{ id: row.draft.coachId }] : []), row => coaches.get(row.id) || "Archived coach").slice(0, 8),
    estimateMix: [...itemTotals].map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 })),
    gear: [{ label: "Gear rental", value: riders.filter(row => row.wantsGear).length }, { label: "Own gear", value: riders.filter(row => !row.wantsGear).length }],
    durations, leadTimes, heatmap,
    geographies: countBy(customers, row => [row.country, row.state].filter(Boolean).join(" / ") || "Location not provided").slice(0, 8),
    verification: [{ label: "Verified", value: customers.filter(row => row.emailVerifiedAt).length }, { label: "Unverified", value: customers.filter(row => !row.emailVerifiedAt).length }],
    frequency: [{ label: "One request", value: requestOwners.filter(row => row.value === 1).length }, { label: "2+ requests", value: requestOwners.filter(row => row.value > 1).length }],
    topics: countBy(current(data.contacts), row => row.topic),
    ratings: [5, 4, 3, 2, 1].map(rating => ({ label: `${rating} stars`, value: reviews.filter(row => Math.round(number(row.rating)) === rating).length })),
    reviewStatus: countBy(reviews, row => row.status),
    inventory: countBy(data.products, row => row.status === "available" && row.available && row.stockQuantity > 0 ? "Ready to rent" : row.status === "maintenance" ? "Maintenance" : row.stockQuantity === 0 ? "Out of stock" : "Unavailable"),
    stock: data.products.reduce((rows, row) => { const category = rows.find(r => r.label === row.category); if (category) category.value += number(row.stockQuantity); else rows.push({ label: row.category, value: number(row.stockQuantity) }); return rows; }, []),
    paymentSources: countBy(payments.filter(row => inPeriod(row.date)), row => row.source),
    details: { outstanding: sum(outstanding, "amountCents") / 100, reviews: reviews.length, averageRating: reviews.length ? sum(reviews, "rating") / reviews.length : 0, inquiries: current(data.contacts).length, signups: current(data.signups).length, inventoryUnits: sum(data.products, "stockQuantity"), coachedRequests: requests.filter(row => row.draft?.coachId || row.draft?.riders?.some(r => r.coachId)).length },
  };
}
module.exports = { analyticsRange, summarizeAnalytics };
