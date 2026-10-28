"use client";
import { useRef, useState } from "react";
import { FiArrowRight, FiCalendar, FiCheck, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import s from "./booking-date-picker.module.css";
type Props = { availableDates: string[]; today: string; lastDate: string; start: string; end: string; onChange: (start: string, end: string) => void };
const addDays = (date: string, count: number) => new Date(Date.parse(`${date}T12:00:00Z`) + count * 86400000).toISOString().slice(0, 10);
const label = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
export default function BookingDatePicker({ availableDates, today, lastDate, start, end, onChange }: Props) {
  const [month, setMonth] = useState(0); const [field, setField] = useState<"start" | "end" | null>(null); const [hover, setHover] = useState("");
  const grid = useRef<HTMLDivElement>(null);
  const mode = field || (start && !end ? "end" : "start");
  const monthDate = new Date(`${today.slice(0, 7)}-01T12:00:00Z`); monthDate.setUTCMonth(monthDate.getUTCMonth() + month);
  const prefix = monthDate.toISOString().slice(0, 7); const year = monthDate.getUTCFullYear(); const number = monthDate.getUTCMonth();
  const count = new Date(Date.UTC(year, number + 1, 0)).getUTCDate(); const offset = monthDate.getUTCDay();
  const available = new Set(availableDates.filter(date => date > today));
  const canEnd = (date: string) => {
    if (!start || date <= start) return false;
    for (let day = start; day <= date; day = addDays(day, 1)) if (!available.has(day)) return false;
    return true;
  };
  const preview = mode === "end" && hover && canEnd(hover) ? hover : "";
  const days = start && end ? Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1 : 0;
  function select(date: string) {
    setHover("");
    if (mode === "end" && start) { onChange(start, date); setField(null); }
    else { onChange(date, ""); setField("end"); }
  }
  function focusField(next: "start" | "end") {
    setField(next); setHover("");
    const date = next === "start" ? start : end || start;
    if (date) setMonth(date.slice(0, 7) === today.slice(0, 7) ? 0 : 1);
  }
  return <section className={s.picker} aria-label="Ride dates">
    <div className={s.heading}><span>Ride dates</span><small>Minimum 2 days &middot; From tomorrow</small></div>
    <div className={s.dateBar}>
      <button type="button" aria-pressed={mode === "start"} onClick={() => focusField("start")}><FiCalendar /><span><small>Start date</small><strong>{start ? label(start) : "Select date"}</strong></span></button>
      <FiArrowRight className={s.dateArrow} aria-hidden="true" />
      <button type="button" aria-pressed={mode === "end"} disabled={!start} onClick={() => focusField("end")}><FiCalendar /><span><small>End date</small><strong>{end ? label(end) : "Select date"}</strong></span></button>
    </div>
    <div className={s.calendar}>
      <div className={s.monthHeader}><h3 aria-live="polite">{new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(monthDate)}</h3><div><button type="button" aria-label="Previous month" disabled={month === 0} onClick={() => { setMonth(0); setHover(""); }}><FiChevronLeft /></button><button type="button" aria-label="Next month" disabled={prefix === lastDate.slice(0, 7)} onClick={() => { setMonth(1); setHover(""); }}><FiChevronRight /></button></div></div>
      <p className={s.instruction} role="status"><span className={s.selectionDot} />{start && end && !field ? "Dates selected. Tap a date to start again." : mode === "end" ? "Now select your last day" : "Select your first day"}</p>
      <div ref={grid} className={s.grid} onMouseLeave={() => setHover("")} onKeyDown={event => {
        const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
        if (!(event.key in moves) || !(event.target instanceof HTMLButtonElement)) return;
        event.preventDefault(); const buttons = Array.from(grid.current?.querySelectorAll<HTMLButtonElement>("button[data-day]") || []); let index = buttons.indexOf(event.target) + moves[event.key]; const direction = moves[event.key] < 0 ? -1 : 1;
        while (index >= 0 && index < buttons.length) { if (!buttons[index].disabled) { buttons[index].focus(); return; } index += direction; }
      }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <span key={day} className={s.weekday}>{day}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`} aria-hidden="true" />)}
        {Array.from({ length: count }, (_, i) => {
          const date = `${prefix}-${String(i + 1).padStart(2, "0")}`; const past = date < today; const open = available.has(date); const from = date === start; const to = date === end;
          const disabled = date <= today || !open || (mode === "end" ? !canEnd(date) : !available.has(addDays(date, 1)) || date >= lastDate);
          const inside = !!start && !!(preview || end) && date >= start && date <= (preview || end);
          return <button key={date} type="button" data-day={date} data-past={past} data-unavailable={!open} data-start={from} data-end={to} data-range={inside} data-today={date === today} disabled={disabled} aria-current={date === today ? "date" : undefined} aria-pressed={from || to} aria-label={`${label(date)}${from ? ", ride start" : to ? ", ride end" : past ? ", past date" : disabled ? ", unavailable for this selection" : ", available"}`} onMouseEnter={() => setHover(date)} onFocus={() => setHover(date)} onBlur={() => setHover("")} onClick={() => select(date)}><strong>{i + 1}</strong><small>{from ? "Start" : to ? "End" : date === today ? "Today" : ""}</small></button>;
        })}
        {Array.from({ length: 42 - offset - count }, (_, i) => <span key={`trailing-${i}`} className={s.emptyDay} aria-hidden="true" />)}
      </div>
      <div className={s.legend}><span><i />Available</span><span><i className={s.unavailableMark} />Unavailable</span><span><i className={s.selectedMark} />Selected</span></div>
    </div>
    <div className={s.footer}><p aria-live="polite">{days ? <><FiCheck />{days} ride days <span>Both dates included</span></> : <><FiCalendar />{start ? "Select an end date to finish." : "Select a start and end date."}</>}</p>{start && <button type="button" onClick={() => { onChange("", ""); setField(null); setHover(""); }}>Clear dates</button>}</div>
  </section>;
}
