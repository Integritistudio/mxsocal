"use client";
import { useEffect, useRef, useState } from "react";
import { FiCalendar, FiCheck, FiCheckCircle, FiChevronLeft, FiChevronRight, FiClock, FiPlus, FiTrash2 } from "react-icons/fi";
import { operations } from "@/services/operations";
import { adminError } from "@/services/product-admin";
import { useUser } from "@/context/UserContext";
import s from "./admin-products.module.css";
type Hours = { start: string; end: string };
type Plan = { days: Record<string, Hours[]>; repeat: boolean };
const fullDay: Hours[] = [{ start: "00:00", end: "24:00" }];
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const minutes = (time: string) => { const [h, m] = time.split(":").map(Number); return h * 60 + m; };
const clock = (time: string) => { const [h, m] = time.split(":").map(Number); return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h % 24 >= 12 ? "pm" : "am"}`; };
const isFull = (hours: Hours[]) => hours.length === 1 && hours[0].start === "00:00" && hours[0].end === "24:00";
export default function AvailabilityCalendar({ type, id, name, onDirtyChange }: { type: "product" | "coach"; id: string; name: string; onDirtyChange?: (dirty: boolean) => void }) {
  const { hasPermission } = useUser(); const permitted = hasPermission(`${type}:update`) || hasPermission("availability:manage");
  const [month, setMonth] = useState(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit" }).format(new Date()));
  const [plan, setPlan] = useState<Plan>({ days: {}, repeat: false }); const [saved, setSaved] = useState<Plan>({ days: {}, repeat: false });
  const anchor = useRef<number | null>(null); const [selected, setSelected] = useState<number[]>([]); const [hours, setHours] = useState<Hours[]>(fullDay); const [mode, setMode] = useState("full");
  const [loadFailed, setLoadFailed] = useState(false); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [revision, setRevision] = useState(0);
  const dirty = JSON.stringify(plan) !== JSON.stringify(saved);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!permitted) return;
    let active = true;
    void operations<{ rule: { days: Record<string, Hours[]>; repeatMonthly: boolean } | null }>(`availability/${type}/${id}?month=${month}`).then(result => { if (active) { const next = { days: result.rule?.days || {}, repeat: result.rule?.repeatMonthly || false }; setPlan(next); setSaved(next); setLoadFailed(false); setLoading(false); setError(""); } }).catch(err => { if (active) { setError(adminError(err)); setLoadFailed(true); setLoading(false); } });
    return () => { active = false; };
  }, [type, id, month, permitted, revision]);
  if (!permitted) return null;
  const count = new Date(`${month}-01T12:00:00Z`); count.setUTCMonth(count.getUTCMonth() + 1, 0);
  const dates = Array.from({ length: count.getUTCDate() }, (_, i) => i + 1);
  const offset = (new Date(`${month}-01T12:00:00Z`).getUTCDay() + 6) % 7;
  const label = new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const closed = dates.filter(day => !(plan.days[day] ?? fullDay).length).length;
  const custom = dates.filter(day => (plan.days[day] ?? fullDay).length && !isFull(plan.days[day] ?? fullDay)).length;
  function changeMonth(value: string) { if (!value || dirty || busy) return; setMonth(value); setLoading(true); setSelected([]); setMessage(""); setError(""); }
  function moveMonth(amount: number) { const date = new Date(`${month}-01T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + amount); changeMonth(date.toISOString().slice(0, 7)); }
  function select(day: number, range = false) {
    if (range && anchor.current !== null) { const start = Math.min(anchor.current, day); const end = Math.max(anchor.current, day); setSelected(dates.filter(value => value >= start && value <= end)); return; }
    anchor.current = day;
    if (!selected.length) { const existing = plan.days[day] ?? fullDay; setHours(existing); setMode(!existing.length ? "closed" : isFull(existing) ? "full" : "custom"); }
    setSelected(old => old.includes(day) ? old.filter(value => value !== day) : [...old, day].sort((a, b) => a - b));
    setMessage("");
  }
  function applyPreset(kind: "full" | "closed" | "business") {
    if (!selected.length) return;
    const values = kind === "closed" ? [] : kind === "full" ? fullDay : [{ start: "09:00", end: "17:00" }];
    setPlan(old => ({ ...old, days: { ...old.days, ...Object.fromEntries(selected.map(day => [day, values])) } }));
    setMode(kind === "business" ? "custom" : kind); setHours(values); setError(""); setMessage(`Updated ${selected.length} selected days. Save availability to publish.`);
  }
  function apply() {
    const values = mode === "closed" ? [] : mode === "full" ? fullDay : hours;
    const sorted = [...values].sort((a, b) => minutes(a.start) - minutes(b.start));
    if (mode === "custom" && (!sorted.length || sorted.some((window, i) => !window.start || !window.end || minutes(window.start) >= minutes(window.end) || (i > 0 && minutes(window.start) < minutes(sorted[i - 1].end))))) { setError("Choose an end time after the start time and keep time windows separate."); return; }
    setPlan(old => ({ ...old, days: { ...old.days, ...Object.fromEntries(selected.map(day => [day, sorted])) } })); setError(""); setMessage(`Updated ${selected.length} ${selected.length === 1 ? "day" : "days"}. Save changes to publish.`);
  }
  async function save() { setBusy(true); setError(""); setMessage(""); try { await operations(`availability/${type}/${id}`, "PUT", { month, repeatMonthly: plan.repeat, days: plan.days }); setSaved(plan); setMessage("Availability saved successfully."); } catch (err) { setError(adminError(err)); } finally { setBusy(false); } }
  return <section id="availability" className={`${s.panel} ${s.calendarPanel}`}><div className={s.header}><div><p className={s.calendarEyebrow}>AVAILABILITY CALENDAR</p><h2>{name}</h2><p className={s.hint}>Choose dates, set their hours, then save. All times are Pacific time.</p></div><span className={s.timezoneChip}><FiClock /> Pacific time</span></div>
    {loading ? <div className={s.adminSkeleton} role="status" aria-label="Loading availability calendar" /> : loadFailed ? <><p className={s.error} role="alert">{error}</p><button className={s.button} onClick={() => { setLoading(true); setRevision(n => n + 1); }}>Try again</button></> : <fieldset disabled={busy} className={s.calendarFieldset}>
      <div className={s.availabilityGuide}><span><b>1</b> Select dates</span><span><b>2</b> Set open hours or close</span><span><b>3</b> Save availability</span></div><div className={s.calendarLayout}><div className={s.calendarMain}><div className={s.calendarMonthBar}><div><h3>{label}</h3><p>{dates.length - closed - custom} full days <span>·</span> {custom} custom <span>·</span> {closed} closed</p></div><div className={s.calendarMonthActions}><button type="button" aria-label="Previous month" title={dirty ? "Save or discard changes first" : "Previous month"} disabled={dirty} onClick={() => moveMonth(-1)}><FiChevronLeft /></button><label><span className={s.visuallyHidden}>Choose month</span><input type="month" value={month} disabled={dirty} onChange={event => changeMonth(event.target.value)} /></label><button type="button" aria-label="Next month" title={dirty ? "Save or discard changes first" : "Next month"} disabled={dirty} onClick={() => moveMonth(1)}><FiChevronRight /></button></div></div>
      <div className={s.calendarPresets}><span>Select:</span>{["All days", "Weekdays", "Weekends"].map((text, i) => <button type="button" key={text} onClick={() => setSelected(dates.filter(day => i === 0 || [0, 6].includes(new Date(`${month}-${String(day).padStart(2, "0")}T12:00:00Z`).getUTCDay()) === (i === 2)))}>{text}</button>)}<button type="button" onClick={() => setSelected([])} disabled={!selected.length}>Clear</button></div>
      <div className={s.selectionTools}><div><strong>{selected.length ? `${selected.length} dates selected` : "Select dates to edit"}</strong><small>Tip: Shift-click to select a date range.</small></div><div><button type="button" disabled={!selected.length} onClick={() => applyPreset("full")}>Open 24h</button><button type="button" disabled={!selected.length} onClick={() => applyPreset("business")}>9am?5pm</button><button type="button" disabled={!selected.length} onClick={() => applyPreset("closed")}>Close dates</button></div></div><div className={s.calendarWeekdays}>{weekdays.map(day => <span key={day}>{day}</span>)}</div><div className={s.calendarDates}>{Array.from({ length: offset }, (_, index) => <span aria-hidden="true" key={`blank-${index}`} />)}{dates.map(day => { const windows = plan.days[day] ?? fullDay; const status = !windows.length ? "closed" : isFull(windows) ? "full" : "custom"; return <button type="button" key={day} data-state={status} aria-pressed={selected.includes(day)} aria-label={`${label} ${day}, ${status === "full" ? "open 24 hours" : status === "closed" ? "closed" : windows.map(window => `${clock(window.start)} to ${clock(window.end)}`).join(", ")}`} onClick={event => select(day, event.shiftKey)}><div><strong>{day}</strong>{selected.includes(day) && <FiCheck aria-hidden="true" />}</div><span className={s.dayStatus}>{status === "full" ? "24 hours" : status === "closed" ? "Closed" : "Custom hours"}</span>{status === "custom" && <small>{windows.map(window => `${clock(window.start)}–${clock(window.end)}`).join(", ")}</small>}</button>; })}</div><div className={s.calendarLegend}><span data-state="full">Open 24 hours</span><span data-state="custom">Custom hours</span><span data-state="closed">Closed</span></div></div>
      <aside className={s.calendarEditor}><FiCalendar size={24} /><h3>{selected.length ? `${selected.length} ${selected.length === 1 ? "day" : "days"} selected` : "Select your dates"}</h3><p className={s.hint}>{selected.length ? `${label.split(" ")[0]} ${selected.join(", ")}` : "Click dates on the calendar, or use the shortcuts to select several at once."}</p><div className={s.hoursModes}>{[{ id: "full", label: "Open 24 hours" }, { id: "custom", label: "Custom hours" }, { id: "closed", label: "Closed all day" }].map(option => <button type="button" aria-pressed={mode === option.id} key={option.id} onClick={() => { setMode(option.id); if (option.id === "custom" && (!hours.length || isFull(hours))) setHours([{ start: "09:00", end: "17:00" }]); }}><span />{option.label}</button>)}</div>{mode === "custom" && <div className={s.customHours}>{hours.map((window, index) => <div key={index} className={s.hoursRow}><label>From<input type="time" value={window.start} onChange={event => setHours(old => old.map((value, i) => i === index ? { ...value, start: event.target.value } : value))} /></label><label>Until<select value={window.end} onChange={event => setHours(old => old.map((value, i) => i === index ? { ...value, end: event.target.value } : value))}>{[...new Set([...Array.from({ length: 96 }, (_, n) => `${String(Math.floor((n + 1) / 4)).padStart(2, "0")}:${String(((n + 1) % 4) * 15).padStart(2, "0")}`), window.end])].sort().map(value => <option value={value} key={value}>{value === "24:00" ? "Midnight" : clock(value)}</option>)}</select></label><button type="button" aria-label={`Remove time window ${index + 1}`} onClick={() => setHours(old => old.filter((_, i) => i !== index))}><FiTrash2 /></button></div>)}<button type="button" className={s.addHours} onClick={() => setHours(old => [...old, { start: "18:00", end: "20:00" }])}><FiPlus /> Add time window</button></div>}<button type="button" className={s.button} disabled={!selected.length} onClick={apply}>Apply to {selected.length || "selected"} {selected.length === 1 ? "day" : "days"}</button><p className={s.hint}>Use the calendar shortcuts for quick changes, or apply custom hours here.</p></aside></div>
      <div className={s.recurrencePanel}><div><h3>When should these hours apply?</h3><p className={s.hint}>{plan.repeat ? "Repeats on the same dates each month. Dates missing from shorter months are skipped." : "Applies only to this month. Other months keep their existing schedule."}</p></div><div className={s.recurrenceChoices}><button type="button" aria-pressed={!plan.repeat} onClick={() => setPlan(old => ({ ...old, repeat: false }))}>This month only</button><button type="button" aria-pressed={plan.repeat} onClick={() => setPlan(old => ({ ...old, repeat: true }))}>Repeat monthly</button></div></div>
      <div className={s.calendarFeedback} aria-live="polite">{error && <p role="alert" className={s.error}>{error}</p>}{message && <p className={s.success}><FiCheckCircle /> {message}</p>}</div><div className={s.calendarSaveBar}><span>{dirty ? "You have unsaved changes" : "All changes saved"}<small>Existing bookings are preserved.</small></span><div><button type="button" className={s.smallButton} disabled={!dirty} onClick={() => { setPlan(saved); setMessage(""); setError(""); }}>Discard changes</button><button type="button" className={s.button} disabled={!dirty || busy} onClick={() => void save()}>{busy ? "Saving…" : "Save availability"}</button></div></div>
    </fieldset>}
  </section>;
}
