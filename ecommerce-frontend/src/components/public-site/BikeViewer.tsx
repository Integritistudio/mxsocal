/* eslint-disable @next/next/no-img-element */
"use client";
import { useRef, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiRotateCcw, FiZoomIn, FiZoomOut } from "react-icons/fi";
import s from "./bike-viewer.module.css";

// Keep frames in camera order. Do not mix the Hardenduro trim into the standard EXC.
const frames = [
  { file: "PHO_BIKE_90_LI_KTM-Enduro-300-EXC-MY27-90-left_#SALL_#AEPI_#V1.png", label: "Left side" },
  { file: "PHO_BIKE_PERS_REVO_KTM-Enduro-300-EXC-MY27-front-right_#SALL_#AEPI_#V1.png", label: "Front right" },
  { file: "PHO_BIKE_90_RE_KTM-Enduro-300-EXC-MY27-90-right_#SALL_#AEPI_#V1 (1).png", label: "Right side" },
].map(frame => ({ ...frame, src: `/360view/ktm300exc/${encodeURIComponent(frame.file)}` }));

export function hasBikeView(name: string, brand?: string | null) {
  return /ktm/i.test(`${brand || ""} ${name}`) && /300[\s_-]*exc\b/i.test(name) && !/hard\s*enduro/i.test(name);
}

export default function BikeViewer({ name }: { name: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const drag = useRef<{ x: number; index: number } | null>(null);
  function move(step: number) { setIndex(value => Math.max(0, Math.min(frames.length - 1, value + step))); }
  return <section className={s.viewer} aria-label={`${name} interactive bike viewer`}>
    <header><div><span className={s.eyebrow}>EXPLORE YOUR RIDE</span><h2>{name}</h2></div><button type="button" onClick={() => { setIndex(0); setZoom(false); }} aria-label="Reset bike view"><FiRotateCcw /></button></header>
    <div className={s.stage} tabIndex={0} role="group" aria-label="Bike angles. Drag or use left and right arrow keys." onKeyDown={event => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); }
      if (event.key === "Home") { event.preventDefault(); setIndex(0); }
      if (event.key === "End") { event.preventDefault(); setIndex(frames.length - 1); }
    }} onPointerDown={event => { if (event.button !== 0) return; drag.current = { x: event.clientX, index }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => {
      if (!drag.current) return;
      const distance = Math.max(60, event.currentTarget.clientWidth / 4);
      setIndex(Math.max(0, Math.min(frames.length - 1, drag.current.index + Math.round((drag.current.x - event.clientX) / distance))));
    }} onPointerUp={event => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
      {frames.map((frame, i) => <img key={frame.src} src={frame.src} alt={i === index ? `${name}, ${frame.label}` : ""} aria-hidden={i !== index} draggable={false} onLoad={() => setLoaded(value => ({ ...value, [i]: true }))} onError={() => setFailed(value => ({ ...value, [i]: true }))} className={`${s.frame} ${i === index && loaded[i] ? s.active : ""} ${zoom ? s.zoomed : ""}`} />)}
      {!loaded[index] && <p className={s.status} role="status">{failed[index] ? "This angle could not load. Try another view." : "Loading bike view…"}</p>}
      <span className={s.angle}>{frames[index].label}</span>
      <button type="button" className={s.zoom} aria-label={zoom ? "Zoom out" : "Zoom in"} aria-pressed={zoom} onPointerDown={event => event.stopPropagation()} onClick={() => setZoom(value => !value)}>{zoom ? <FiZoomOut /> : <FiZoomIn />}</button>
    </div>
    <div className={s.controls}><button type="button" aria-label="Previous angle" disabled={index === 0} onClick={() => move(-1)}><FiArrowLeft /></button><p aria-live="polite">{frames[index].label}<small>Drag or swipe to explore</small></p><button type="button" aria-label="Next angle" disabled={index === frames.length - 1} onClick={() => move(1)}><FiArrowRight /></button></div>
    <div className={s.thumbnails} aria-label="Choose a bike angle">{frames.map((frame, i) => <button key={frame.src} type="button" aria-pressed={index === i} onClick={() => setIndex(i)}><img src={frame.src} alt="" draggable={false} /><span>{frame.label}</span></button>)}</div>
    <p className={s.note}>3 photo angles · 2027 KTM 300 EXC reference images</p>
  </section>;
}
