"use client";
import { useId, useRef, useState } from "react";
import { FiChevronDown, FiCheck, FiSearch } from "react-icons/fi";
import { countries, countryCodeFor } from "./account-locations";
import s from "./customer-account.module.css";
function flag(name: string) { const code = countryCodeFor(name); return code ? String.fromCodePoint(...[...code].map(letter => 127397 + letter.charCodeAt(0))) : ""; }
export default function CountrySelect({ value, onChange }: { value: string; onChange: (country: string) => void }) {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(""); const id = useId(); const trigger = useRef<HTMLButtonElement>(null);
  const options = countries.filter(country => country.toLowerCase().includes(query.toLowerCase()));
  return <div className={s.countryField} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } }}>
    <span id={`${id}-label`}>Country</span><input type="hidden" name="country" value={value} />
    <button type="button" ref={trigger} className={s.countryTrigger} aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={`${id}-options`} onClick={() => { setOpen(!open); setQuery(""); }}><span id={`${id}-value`}><span aria-hidden="true">{flag(value)}</span> {value}</span><FiChevronDown /></button>
    {open && <div className={s.countryMenu}><div className={s.countrySearch}><FiSearch /><input autoFocus aria-label="Search countries" placeholder="Search countries" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); event.currentTarget.closest(`.${s.countryMenu}`)?.querySelector<HTMLButtonElement>("button")?.focus(); } }} /></div><div id={`${id}-options`} className={s.countryOptions} role="group" aria-label="Countries">{options.map(country => <button type="button" key={country} aria-pressed={country === value} onClick={() => { onChange(country); setOpen(false); trigger.current?.focus(); }} onKeyDown={event => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); const next = event.key === "ArrowDown" ? event.currentTarget.nextElementSibling : event.currentTarget.previousElementSibling; if (next instanceof HTMLElement) next.focus(); } }}><span><span aria-hidden="true">{flag(country)}</span> {country}</span>{country === value && <FiCheck />}</button>)}{!options.length && <p>No countries found.</p>}</div></div>}
  </div>;
}
