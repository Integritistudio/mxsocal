"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FiCheck, FiChevronDown } from "react-icons/fi";
import s from "./coaches-design.module.css";

type Option = { value: string; label: string };
export default function CoachFilter({ label, value, appliedValue, options, onChange }: { label: string; value: string; appliedValue: string; options: Option[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const search = useRef({ text: "", time: 0 });
  const id = useId();
  const reduced = useReducedMotion();
  const selected = Math.max(0, options.findIndex(option => option.value === value));
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  function highlight(index: number) {
    setActive(index);
    const item = menu.current?.children[index] as HTMLElement | undefined;
    if (item && menu.current) {
      if (item.offsetTop < menu.current.scrollTop) menu.current.scrollTop = item.offsetTop;
      else if (item.offsetTop + item.offsetHeight > menu.current.scrollTop + menu.current.clientHeight) menu.current.scrollTop = item.offsetTop + item.offsetHeight - menu.current.clientHeight;
    }
  }
  function choose(index: number) { onChange(options[index].value); setOpen(false); trigger.current?.focus(); }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Tab") { setOpen(false); return; }
    if (event.key === "Escape") { if (open) { event.preventDefault(); event.stopPropagation(); setOpen(false); } return; }
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      if (!open) { setActive(event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : selected); setOpen(true); return; }
      if (event.key === "Enter" || event.key === " ") choose(active);
      else highlight(event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (active + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      search.current = { text: (now - search.current.time > 700 ? "" : search.current.text) + event.key.toLowerCase(), time: now };
      const index = options.findIndex(option => option.label.toLowerCase().startsWith(search.current.text));
      if (index >= 0) { setOpen(true); highlight(index); }
    }
  }
  return <div className={s.filterField} ref={root}>
    <button className={s.filterTrigger} data-selected={value !== "" && value === appliedValue} ref={trigger} type="button" role="combobox" aria-label={label} aria-expanded={open} aria-haspopup="listbox" aria-controls={`${id}-options`} aria-activedescendant={open ? `${id}-option-${active}` : undefined} onKeyDown={keyDown} onBlur={event => { if (!root.current?.contains(event.relatedTarget as Node | null)) setOpen(false); }} onClick={() => { setActive(selected); setOpen(previous => !previous); }}><span>{options[selected].label}</span><FiChevronDown size={17} aria-hidden="true" className={open ? s.chevronOpen : undefined} /></button>
    {open && <motion.ul ref={menu} className={s.filterMenu} role="listbox" id={`${id}-options`} aria-label={label} initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}>{options.map((option, index) => <li id={`${id}-option-${index}`} key={option.value} role="option" aria-selected={value === option.value} className={index === active ? s.activeOption : undefined} onPointerMove={() => setActive(index)} onPointerDown={event => event.preventDefault()} onClick={() => choose(index)}><span>{option.label}</span>{value === option.value && <FiCheck size={17} aria-hidden="true" />}</li>)}</motion.ul>}
  </div>;
}
