const timeZone = "America/Los_Angeles";
function currentMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit" }).formatToParts(now);
  return `${parts.find(p => p.type === "year").value}-${parts.find(p => p.type === "month").value}`;
}
function validateDays(month, days) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !days || typeof days !== "object" || Array.isArray(days)) return false;
  const [year, number] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return Object.entries(days).every(([date, entry]) => date.startsWith(`${month}-`) && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number(date.slice(-2)) >= 1 && Number(date.slice(-2)) <= lastDay && entry && typeof entry === "object" && ["available", "unavailable"].includes(entry.status) && typeof entry.note === "string" && entry.note.length <= 300);
}
function availabilityMonths(now = new Date()) {
  const month = currentMonth(now);
  const [year, number] = month.split("-").map(Number);
  return [month, new Date(Date.UTC(year, number, 1)).toISOString().slice(0, 7)];
}
function currentDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type).value).join("-");
}
module.exports = { currentMonth, currentDate, availabilityMonths, validateDays, timeZone };
