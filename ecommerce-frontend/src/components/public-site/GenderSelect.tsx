"use client";
import { useId, useRef, useState } from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";
import s from "./customer-account.module.css";
const options = [["", "Choose (optional)"], ["woman", "Woman"], ["man", "Man"], ["non-binary", "Non-binary"], ["transgender", "Transgender"], ["genderfluid", "Genderfluid"], ["agender", "Agender"], ["prefer-not-to-say", "Prefer not to say"]];
export default function GenderSelect({ defaultValue = "" }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue); const [open, setOpen] = useState(false);
  const id = useId(); const trigger = useRef<HTMLButtonElement>(null); const list = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option[0] === value)?.[1] || "Choose (optional)";
  return <div className={s.countryField} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } }}>
    <span id={`${id}-label`}>Gender</span><input type="hidden" name="gender" value={value} />
    <button type="button" ref={trigger} className={s.countryTrigger} aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={`${id}-options`} onClick={() => setOpen(!open)} onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); requestAnimationFrame(() => list.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus()); } }}><span id={`${id}-value`}>{selected}</span><FiChevronDown style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform .2s ease" }} /></button>
    {open && <div className={s.countryMenu}><div ref={list} id={`${id}-options`} className={s.countryOptions} role="group" aria-label="Gender options">{options.map(([key, label]) => <button key={key} type="button" aria-pressed={value === key} onClick={() => { setValue(key); setOpen(false); trigger.current?.focus(); }} onKeyDown={event => { let target: Element | null = null; if (event.key === "ArrowDown") target = event.currentTarget.nextElementSibling; else if (event.key === "ArrowUp") target = event.currentTarget.previousElementSibling; else if (event.key === "Home") target = list.current?.firstElementChild || null; else if (event.key === "End") target = list.current?.lastElementChild || null; else return; event.preventDefault(); if (target instanceof HTMLElement) target.focus(); }}><span>{label}</span>{value === key && <FiCheck aria-hidden="true" />}</button>)}</div></div>}
  </div>;
}
