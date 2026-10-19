export function bookingDateLabel(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}
export function bookingTimeLabel(time: string) {
  const [rawHour, minute] = time.split(":").map(Number);
  const hour = rawHour % 24;
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}
export function bookingSessionLabel(slots: { start: string; end: string }[]) {
  return slots.map(slot => `${bookingTimeLabel(slot.start)} – ${bookingTimeLabel(slot.end)}`).join(", ");
}
