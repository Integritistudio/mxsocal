/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { FiSearch, FiX, FiImage } from "react-icons/fi";
import s from "./site-search.module.css";
type Results = { groups: { label: string; total: number; results: { id: string; title: string; href: string; image: string | null }[] }[]; hasMore: boolean };
export default function SiteSearch({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ key: string; data: Results } | null>(null);
  const [failure, setFailure] = useState("");
  const [retry, setRetry] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const term = query.trim();
  const key = `${term}:${page}:${retry}`;
  const data = result?.key === key ? result.data : null;
  useEffect(() => {
    if (!term || !open) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?${new URLSearchParams({ q: term, page: String(page) })}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search is unavailable. Please try again.");
        const data: Results = await response.json();
        if (!controller.signal.aborted) setResult({ key, data });
      } catch {
        if (!controller.signal.aborted) setFailure(key);
      }
    }, 250);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [term, page, key, open]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);
  const total = data?.groups.reduce((sum, group) => sum + group.total, 0) || 0;
  return <div ref={root} className={`${s.root} ${mobile ? s.mobile : ""}`} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }} onKeyDown={event => {
    if (event.key === "Escape") { event.stopPropagation(); setOpen(false); input.current?.focus(); }
    if (event.key === "ArrowDown" && event.target === input.current) { event.preventDefault(); root.current?.querySelector<HTMLAnchorElement>("a")?.focus(); }
  }}>
    <form role="search" className={s.form} onSubmit={event => { event.preventDefault(); setOpen(true); }}>
      <FiSearch aria-hidden="true" />
      <input ref={input} type="search" aria-label="Search blogs, bikes, coaches and tracks" aria-controls={open && term ? id : undefined} placeholder="Search MXSoCal" maxLength={100} value={query} onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setPage(1); setOpen(true); }} />
      {query && <button type="button" aria-label="Clear search" onClick={() => { setQuery(""); setPage(1); input.current?.focus(); }}><FiX aria-hidden="true" /></button>}
    </form>
    {open && term && <div id={id} className={s.dropdown} aria-label="Search results">
      {!data ? failure === key ? <div className={s.message} role="alert">Search is unavailable. <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button></div> : <p className={s.message} role="status">Searching…</p> : <>
        <p className={s.count} role="status">{total ? `${total} ${total === 1 ? "result" : "results"}` : `No results for “${term}”`}</p>
        {data.groups.filter(group => group.results.length).map(group => <section key={group.label}><h2>{group.label} <span>{group.total}</span></h2>{group.results.map(item => <Link href={item.href} key={item.id} onClick={() => { setOpen(false); onNavigate?.(); }}>{group.label !== "Tracks" && <span className={s.thumbnail} data-bike={group.label === "Bikes"} aria-hidden="true">{item.image && !failedImages[item.image] ? <img src={item.image} alt="" loading="lazy" onError={() => setFailedImages(previous => ({ ...previous, [item.image!]: true }))} /> : <FiImage />}</span>}<span className={s.resultTitle}>{item.title}</span><span aria-hidden="true">↗</span></Link>)}</section>)}
        {!total && <p className={s.message}>Try a bike, coach, track name or blog title.</p>}
        {!!total && !data.groups.some(group => group.results.length) && <p className={s.message}>No more results on this page.</p>}
        {(page > 1 || data.hasMore) && <nav className={s.pagination} aria-label="Search result pages"><button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page}</span><button type="button" disabled={!data.hasMore} onClick={() => setPage(value => value + 1)}>Next</button></nav>}
      </>}
    </div>}
  </div>;
}
