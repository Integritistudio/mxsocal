/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { FiArrowLeft, FiArrowRight, FiArrowUpRight } from "react-icons/fi";
import type { HomeBike } from "@/lib/home-content";
import type { Track } from "@/lib/tracks";
import s from "./home-three.module.css";

const ease = [0.22, 1, 0.36, 1] as const;
const money = (amount: string | null, currency = "USD") => amount == null ? null : new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(amount));

export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return <motion.div
    className={className}
    initial={reduce ? false : { opacity: 0, y: 18 }}
    whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.14 }}
    transition={{ duration: 0.72, delay, ease }}
  >{children}</motion.div>;
}

export function HeroMedia() {
  const shell = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: shell, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "16%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.08]);

  useEffect(() => {
    const node = video.current;
    if (!node) return;
    if (reduce) {
      node.pause();
      return;
    }
    node.muted = true;
    void node.play().catch(() => undefined);
  }, [reduce]);

  return <div className={s.heroMedia} ref={shell} aria-hidden="true">
    <motion.video
      ref={video}
      style={{ y, scale }}
      src="/videos/herosection.mp4"
      autoPlay={reduce === false}
      muted
      loop
      playsInline
      preload="auto"
    />
  </div>;
}

export function Marquee({ items, className }: { items: string[]; className?: string }) {
  const row = (prefix: string) => items.map((item, index) => <span key={`${prefix}-${index}`}>{item}<i /></span>);
  return <div className={`${s.marquee} ${className ?? ""}`} aria-label={items.join(", ")}>
    <div className={s.marqueeTrack} aria-hidden="true">{row("a")}{row("b")}</div>
  </div>;
}

export function Chip({ src, alt }: { src: string; alt: string }) {
  const reduce = useReducedMotion();
  return <motion.span
    className={s.chip}
    initial={reduce ? false : { width: 0, opacity: 0 }}
    whileInView={reduce ? undefined : { width: "1.9em", opacity: 1 }}
    viewport={{ once: true, amount: 0.55 }}
    transition={{ duration: 0.85, ease }}
  ><img src={src} alt={alt} loading="lazy" /></motion.span>;
}

export type DayStep = { time: string; title: string; text: string; image: string; alt: string };

export function DayScroller({ steps }: { steps: DayStep[] }) {
  const [active, setActive] = useState(0);
  const nodes = useRef<(HTMLElement | null)[]>([]);
  const reduce = useReducedMotion();
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(Number((visible.target as HTMLElement).dataset.index));
    }, { rootMargin: "-38% 0px -38% 0px", threshold: [0, 0.25, 0.5] });
    nodes.current.forEach(node => node && observer.observe(node));
    return () => observer.disconnect();
  }, [steps]);
  const current = steps[active] ?? steps[0];
  return <div className={s.day}>
    <div className={s.daySticky}>
      <span className={s.eyebrow}>Built into every ride</span>
      <div className={s.dayClock} aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.strong
            key={current.time}
            initial={reduce ? false : { y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: -14, opacity: 0 }}
            transition={{ duration: 0.4, ease }}
          >{current.time}</motion.strong>
        </AnimatePresence>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={current.title}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease }}
        >{current.title}</motion.p>
      </AnimatePresence>
      <ol className={s.dayDots}>
        {steps.map((step, index) => <li key={step.time} className={index === active ? s.dayDotActive : undefined}>
          <button type="button" aria-label={`Go to ${step.time}, ${step.title}`} onClick={() => nodes.current[index]?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" })} />
        </li>)}
      </ol>
    </div>
    <div className={s.daySteps}>
      {steps.map((step, index) => <article
        key={step.time}
        data-index={index}
        ref={node => { nodes.current[index] = node; }}
        className={`${s.dayStep} ${index === active ? s.dayStepActive : ""}`}
      >
        <div className={s.dayImage}><img src={step.image} alt={step.alt} loading="lazy" /><span>{step.time}</span></div>
        <div className={s.dayText}><h3>{step.title}</h3><p>{step.text}</p></div>
      </article>)}
    </div>
  </div>;
}

export function BikeRail({ bikes }: { bikes: HomeBike[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const scroll = (dir: -1 | 1) => {
    const node = rail.current;
    if (!node) return;
    node.scrollBy({ left: dir * (node.clientWidth * 0.8), behavior: reduce ? "auto" : "smooth" });
  };
  return <>
    <div className={s.rail} ref={rail}>
      {bikes.map((bike, index) => {
        const href = `/bikes/${bike.slug || bike.id}`;
        const book = `/booking?bike=${encodeURIComponent(bike.id)}&name=${encodeURIComponent(bike.name)}`;
        const price = money(bike.pricePerDay, bike.currency || "USD");
        return <motion.article
          key={bike.id}
          className={s.bike}
          initial={reduce ? false : { opacity: 0, y: 18 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.65, delay: Math.min(index, 3) * 0.07, ease }}
        >
          <Link className={s.bikePhoto} href={href} aria-label={`View ${bike.name}`}>
            {bike.images[0] && <img src={bike.images[0]} alt={bike.name} loading="lazy" />}
            <span>{String(index + 1).padStart(2, "0")}</span>
          </Link>
          <div className={s.bikeBody}>
            <h3><Link href={href}>{bike.name}</Link></h3>
            {bike.tagline && <p>{bike.tagline}</p>}
            {bike.features?.length > 0 && <ul>{bike.features.slice(0, 3).map((feature, idx) => <li key={`${feature}-${idx}`}>{feature}</li>)}</ul>}
            <div className={s.bikeFoot}>
              <strong>{price ?? "Ask us"}{price && <small>per day</small>}</strong>
              <Link href={book}>Book<FiArrowUpRight /></Link>
            </div>
          </div>
        </motion.article>;
      })}
    </div>
    <div className={s.railControls}>
      <div>
        <button type="button" aria-label="Previous bikes" onClick={() => scroll(-1)}><FiArrowLeft /></button>
        <button type="button" aria-label="Next bikes" onClick={() => scroll(1)}><FiArrowRight /></button>
      </div>
      <Link href="/bikes" className={s.textLink}>Every bike in the fleet<FiArrowUpRight /></Link>
    </div>
  </>;
}

export function TrackReveal({ tracks }: { tracks: Track[] }) {
  const [active, setActive] = useState(0);
  const current = tracks[active];
  return <div className={s.trackReveal}>
    <ul className={s.trackList}>
      {tracks.map((track, index) => <li key={track.id}>
        <Link
          href={`/tracks/${track.slug}`}
          className={index === active ? s.trackActive : undefined}
          onMouseEnter={() => setActive(index)}
          onFocus={() => setActive(index)}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{track.name}</strong>
          <small>{track.city}, CA</small>
          <FiArrowUpRight aria-hidden="true" />
        </Link>
        {track.images[0] && <div className={s.trackInline}><img src={track.images[0]} alt={track.name} loading="lazy" /></div>}
      </li>)}
    </ul>
    <div className={s.trackStage} aria-hidden="true">
      {tracks.map((track, index) => track.images[0] && <img key={track.id} src={track.images[0]} alt="" loading="lazy" className={index === active ? s.trackStageActive : undefined} />)}
      {current && <span className={s.trackStageLabel}>{current.city}, California</span>}
    </div>
  </div>;
}

