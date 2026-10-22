/* eslint-disable @next/next/no-img-element */
"use client";
import { useRef, useState, useEffect } from "react";
import { FiX, FiArrowLeft, FiArrowRight } from "react-icons/fi";
import type { Track } from "@/lib/tracks";
import s from "./tracks-design.module.css";
export default function TrackGallery({ track }: { track: Track }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<number | null>(null);
  const open = index !== null;
  useEffect(() => { if (!open) return; dialog.current?.showModal(); const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = previous; }; }, [open]);
  function move(direction: number) { setIndex(current => current === null ? null : (current + direction + track.images.length) % track.images.length); }
  function close() { dialog.current?.close(); setIndex(null); }
  return <><div className={s.trackGallery} data-count={track.images.length}>{track.images.slice(0, 3).map((image, i) => <button type="button" key={image} onClick={() => setIndex(i)} aria-label={`View ${track.name} photo ${i + 1}`}><img src={image} alt={`${track.name} — track photo ${i + 1}`} loading={i === 0 ? "eager" : "lazy"} />{i === 2 && <span>View all {track.images.length} photos</span>}</button>)}</div>
    <dialog ref={dialog} className={s.photoDialog} aria-label={`${track.name} photos`} onClose={() => setIndex(null)} onKeyDown={event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); } }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <header className={s.photoHeader}><span>{track.name}</span><button type="button" autoFocus aria-label="Close photos" onClick={close}><FiX /></button></header>
      {index !== null && <><div className={s.photoStage} onTouchStart={event => { touchStart.current = event.touches[0]?.clientX ?? null; }} onTouchCancel={() => { touchStart.current = null; }} onTouchEnd={event => { const end = event.changedTouches[0]?.clientX; if (touchStart.current !== null && end !== undefined && Math.abs(end - touchStart.current) > 50) move(end < touchStart.current ? 1 : -1); touchStart.current = null; }}><img className={s.fullPhoto} src={track.images[index]} alt={`${track.name} — track photo ${index + 1}`} draggable={false} /></div><div className={s.photoControls}><button type="button" disabled={track.images.length < 2} aria-label="Previous photo" onClick={() => move(-1)}><FiArrowLeft /></button><span aria-live="polite">{index + 1} <span>/ {track.images.length}</span></span><button type="button" disabled={track.images.length < 2} aria-label="Next photo" onClick={() => move(1)}><FiArrowRight /></button></div></>}
    </dialog>
  </>;
}
