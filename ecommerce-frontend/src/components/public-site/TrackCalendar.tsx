"use client";
import { useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import type { TrackAvailability } from "@/lib/tracks";
import s from "./tracks-design.module.css";
export const monthLabel = (month: string) => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`));
export function MonthNavigation({ months, index, onChange, disabled = false }: { months: TrackAvailability[]; index: number; onChange: (index: number) => void; disabled?: boolean }) {
  return <div className={s.monthNavigation}><button type="button" aria-label="Previous month" disabled={disabled || index === 0} onClick={() => onChange(index - 1)}><FiChevronLeft /></button><h3 aria-live="polite">{monthLabel(months[index].month)}</h3><button type="button" aria-label="Next month" disabled={disabled || index === months.length - 1} onClick={() => onChange(index + 1)}><FiChevronRight /></button></div>;
}
export function MonthGrid({ calendar, selected, onSelect }: { calendar: TrackAvailability; selected: string; onSelect: (date: string) => void }) {
  const [year, month] = calendar.month.split("-").map(Number);
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return <div className={s.calendarGrid}>
    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <span key={day} className={s.weekday}>{day}</span>)}
    {Array.from({ length: offset }, (_, i) => <span key={`empty-${i}`} aria-hidden="true" />)}
    {Array.from({ length: count }, (_, i) => {
      const date = `${calendar.month}-${String(i + 1).padStart(2, "0")}`;
      const past = date < calendar.today;
      const today = date === calendar.today;
      const status = calendar.days[date]?.status || "unavailable";
      return <button key={date} type="button" className={s.calendarDay} data-status={status} data-past={past} data-today={today} disabled={past} aria-current={today ? "date" : undefined} aria-pressed={selected === date} aria-label={`${date}${today ? ", Today" : ""}: ${past ? "Past date" : status}`} onClick={() => onSelect(date)}><strong>{i + 1}</strong><span>{past ? "Past" : status === "available" ? "Available" : "Unavailable"}</span>{today && <small>Today</small>}</button>;
    })}
  </div>;
}
export default function TrackCalendar({ calendars }: { calendars?: TrackAvailability[] }) {
  const [selected, setSelected] = useState("");
  const [index, setIndex] = useState(0);
  if (!calendars?.length) return <p role="status">Track availability is temporarily unavailable. Please try again shortly.</p>;
  const calendar = calendars[index];
  const entry = calendar.days[selected];
  return <div className={s.calendar}>
    <div className={s.calendarHeading}><MonthNavigation months={calendars} index={index} onChange={value => { setIndex(value); setSelected(""); }} /><span>Pacific time</span></div>
    <div className={s.legend}><span data-status="available">Available</span><span data-status="unavailable">Unavailable</span><span>Past dates</span></div>
    <MonthGrid calendar={calendar} selected={selected} onSelect={setSelected} />
    <div className={s.dayDetails} role="status">{selected ? <><strong>{new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${selected}T12:00:00Z`))} - {entry?.status === "available" ? "Available" : "Unavailable"}</strong>{entry?.note && <p>{entry.note}</p>}</> : "Select a date to view track availability."}</div>
  </div>;
}
