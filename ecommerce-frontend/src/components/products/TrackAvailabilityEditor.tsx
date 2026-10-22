"use client";
import { useState } from "react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import type { Track, TrackAvailability } from "@/lib/tracks";
import { MonthGrid, MonthNavigation } from "../public-site/TrackCalendar";
import calendarStyle from "../public-site/tracks-design.module.css";
import s from "./admin-products.module.css";
type Item = { track: Track; availabilityMonths?: TrackAvailability[] };
function Editor({ item, monthIndex, onDirty, onSaved }: { item: Item; monthIndex: number; onDirty: (value: boolean) => void; onSaved: (calendar: TrackAvailability) => void }) {
  const [calendar, setCalendar] = useState(item.availabilityMonths?.[monthIndex]);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  if (!calendar) return <p role="alert">Unable to load this track calendar. Refresh to try again.</p>;
  const entry = calendar.days[selected];
  function change(status: string, note: string) {
    if (!calendar || !selected) return;
    const days = { ...calendar.days };
    days[selected] = { status: status as "available" | "unavailable", note };
    setCalendar({ ...calendar, days }); onDirty(true); setMessage("");
  }
  async function save() {
    setSaving(true); setMessage("");
    try { const response = await fetch(`/api/track-availability/${item.track.slug}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(calendar) }); const result = await response.json(); if (!response.ok) throw new Error(result.message); setCalendar(result); onSaved(result); onDirty(false); setMessage("Track availability saved."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save."); }
    finally { setSaving(false); }
  }
  return <div className={s.panel}>
    <div className={s.header}><div><h2>{item.track.name}</h2><p className={s.hint}>{calendar.month} · Pacific time</p></div><Link href={`/tracks/${item.track.slug}#track-availability`} target="_blank">View public calendar ↗</Link></div>
    <div className={calendarStyle.adminCalendar}><MonthGrid calendar={calendar} selected={selected} onSelect={setSelected} /></div>
    <fieldset disabled={saving} className={calendarStyle.editorFields}>
      <legend>{selected || "Select a day to edit"}</legend>
      {selected && <><label className={s.field}>Availability<select value={entry?.status || "unavailable"} onChange={event => change(event.target.value, entry?.note || "")}><option value="available">Available</option><option value="unavailable">Unavailable</option></select></label><label className={s.field}>Public note (optional)<textarea maxLength={300} value={entry?.note || ""} onChange={event => change(entry?.status || "unavailable", event.target.value)} placeholder="Hours, closures or track-day details" /></label></>}
      <button type="button" className={s.button} onClick={save}>{saving ? "Saving…" : "Save Track Availability"}</button>
    </fieldset>
    {message && <p role="status">{message}</p>}
  </div>;
}
export default function TrackAvailabilityEditor({ calendars }: { calendars: Item[] }) {
  const { hasPermission } = useUser();
  const [selected, setSelected] = useState(calendars[0]?.track.slug || "");
  const [dirty, setDirty] = useState(false);
  const [items, setItems] = useState(calendars);
  const [revision, setRevision] = useState(0);
  const [monthIndex, setMonthIndex] = useState(0);
  if (!hasPermission("availability:manage")) return <p>Track availability editing permission is required.</p>;
  const item = items.find(item => item.track.slug === selected);
  return <div><div className={s.panel}><h1>Track availability</h1><p className={s.hint}>Manage this month and next month. Unset dates are unavailable. Past dates cannot be edited.</p><label className={s.field}>Track<select disabled={dirty} value={selected} onChange={event => setSelected(event.target.value)}>{items.map(item => <option key={item.track.slug} value={item.track.slug}>{item.track.name}</option>)}</select></label>{item?.availabilityMonths?.length && <MonthNavigation months={item.availabilityMonths} index={monthIndex} onChange={setMonthIndex} disabled={dirty} />}{dirty && <p className={s.hint}>Save or discard changes before switching tracks or months. <button onClick={() => { setDirty(false); setRevision(value => value + 1); }}>Discard changes</button></p>}</div>{item && <Editor key={`${item.track.slug}-${monthIndex}-${revision}`} item={item} monthIndex={monthIndex} onDirty={setDirty} onSaved={availability => setItems(previous => previous.map(value => value.track.slug === selected ? { ...value, availabilityMonths: value.availabilityMonths?.map(month => month.month === availability.month ? availability : month) } : value))} />}</div>;
}
