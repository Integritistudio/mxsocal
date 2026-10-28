/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FiArrowLeft, FiArrowRight, FiArrowUpRight, FiPause, FiPlay, FiVolume2, FiVolumeX } from "react-icons/fi";
import type { HomeBike } from "@/lib/home-content";
import FooterContactForm from "./FooterContactForm";
import Aurora from "@/components/react-bits/Aurora";
import s from "./home-one.module.css";

const revealEase = [0.22, 1, 0.36, 1] as const;

export function HomeOneReveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();
  return <motion.div
    className={className}
    initial={reduceMotion ? false : { opacity: 0, y: 18 }}
    whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.14 }}
    transition={{ duration: 0.72, delay, ease: revealEase }}
  >{children}</motion.div>;
}

const typedPhrases = ["All yours.", "On the dirt."];

export function HomeOneTyped({ phrases = typedPhrases }: { phrases?: string[] }) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(reduceMotion ? phrases[0] : "");
  useEffect(() => {
    if (reduceMotion || !phrases.length) { setShown(phrases[0] || ""); return; }
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let pause = 0;
    let timer = 0;
    const tick = () => {
      const phrase = phrases[phraseIndex] || "";
      if (pause > 0) {
        pause -= 1;
        timer = window.setTimeout(tick, 80);
        return;
      }
      if (!deleting) {
        charIndex += 1;
        setShown(phrase.slice(0, charIndex));
        if (charIndex >= phrase.length) {
          deleting = true;
          pause = 18;
          timer = window.setTimeout(tick, 80);
          return;
        }
        timer = window.setTimeout(tick, 70);
        return;
      }
      charIndex -= 1;
      setShown(phrase.slice(0, Math.max(0, charIndex)));
      if (charIndex <= 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        pause = 4;
        timer = window.setTimeout(tick, 80);
        return;
      }
      timer = window.setTimeout(tick, 40);
    };
    timer = window.setTimeout(tick, 200);
    return () => window.clearTimeout(timer);
  }, [phrases, reduceMotion]);
  return <em className={s.typed}>{shown}<span className={s.typedCursor} aria-hidden="true" /></em>;
}

const gridImages = [
  "/images/home/img1.jpg", "/images/home/img2.jpg", "/images/home/img3.jpg", "/images/home/img4.jpg",
  "/images/home/img5.jpg", "/images/home/img6.jpg", "/images/home/img7.jpeg", "/images/home/img8.jpeg",
  "/images/home/img9.jpeg", "/images/home/img10.jpeg", "/images/home/img11.jpg", "/images/home/img12.png",
  "/images/home/img13.jpg", "/images/home/bg-red.png",
  "/images/about/04e3b.png", "/images/about/26411.png", "/images/about/2924d.png", "/images/about/3256a.png",
  "/images/about/357e3.png", "/images/about/3ff1b.png", "/images/about/467ad.png", "/images/about/4eeb0.png",
  "/images/about/54bae.png", "/images/about/59326.png", "/images/about/5b45b.png", "/images/about/73eb2.png",
  "/images/about/7649b.png", "/images/about/8939c.png", "/images/about/9fd50.png", "/images/about/a89c9.png",
  "/images/about/b541a.png", "/images/about/ddebc.png", "/images/about/eb879.png", "/images/about/edd38.png",
  "/images/contact/09822.png", "/images/contact/15bbc.png", "/images/contact/19704.png", "/images/contact/1be2a.png",
  "/images/contact/3fdb9.png", "/images/contact/41739.png", "/images/contact/47732.png", "/images/contact/48e2a.png",
  "/images/contact/4ad62.png", "/images/contact/4e4f2.png", "/images/contact/50a88.png", "/images/contact/56553.png",
  "/images/contact/58b51.png", "/images/contact/5e2be.png", "/images/contact/699f7.png", "/images/contact/70895.png",
  "/images/contact/70aec.png", "/images/contact/7151f.png", "/images/contact/756a5.png", "/images/contact/8f55a.png",
  "/images/contact/902cb.png", "/images/contact/93845.png", "/images/contact/9626f.png", "/images/contact/9c728.png",
  "/images/contact/b0cc1.png", "/images/contact/b541a.png", "/images/contact/b79e1.png", "/images/contact/b9e5a.png",
  "/images/contact/c0cae.png", "/images/contact/cb13e.png", "/images/contact/d3317.png", "/images/contact/ddbdf.png",
  "/images/contact/e0fd3.png", "/images/contact/f625b.png", "/images/contact/f70d6.png", "/images/contact/ff76a.png",
];
const gridVideos = ["/videos/herosection.mp4", "/videos/login-signup-videos.mov", "/videos/404-video.mov"];
const videoSlots = new Set([3, 9, 14, 22, 28, 35, 41, 48, 55, 61]);

export function HomeOneBgGrid() {
  const reduceMotion = useReducedMotion();
  return <div className={s.bgGrid} aria-hidden="true">
    {Array.from({ length: 64 }, (_, index) => {
      const isVideo = videoSlots.has(index);
      const src = isVideo ? gridVideos[index % gridVideos.length] : gridImages[index % gridImages.length];
      return <div className={s.bgCell} key={`${src}-${index}`}>
        {isVideo
          ? <video src={src} muted loop playsInline autoPlay={reduceMotion === false} preload="metadata" />
          : <img src={src} alt="" loading="lazy" />}
      </div>;
    })}
  </div>;
}

export function HomeOneVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (reduceMotion === true) video.current?.pause();
    else if (reduceMotion === false) void video.current?.play().catch(() => undefined);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) { setProgress(1); return; }
    const update = () => {
      const el = pin.current;
      if (!el) return;
      const total = Math.max(1, el.offsetHeight - window.innerHeight);
      const scrolled = Math.min(Math.max(-el.getBoundingClientRect().top, 0), total);
      setProgress(scrolled / total);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [reduceMotion]);

  const width = `calc(${76 + progress * 24}vw)`;
  const height = `calc(${36 + progress * 64}vh)`;
  const radius = `${Math.max(0, 10 * (1 - progress))}px`;

  return <div className={s.filmPin} ref={pin}>
    <div className={s.filmSticky} style={{ ["--film-progress" as string]: String(progress) }}>
      <div className={s.film} style={{ width, height, borderRadius: radius }}>
        <video ref={video} src="/videos/herosection.mp4" poster="/images/contact/b541a.png" autoPlay={reduceMotion === false} muted={muted} playsInline loop preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} aria-label="MXSoCal rider on a Southern California motocross track" />
        <div className={s.filmControls}>
          <button type="button" aria-label={playing ? "Pause riding video" : "Play riding video"} onClick={() => { if (playing) video.current?.pause(); else void video.current?.play().catch(() => undefined); }}>{playing ? <FiPause /> : <FiPlay />}</button>
          <button type="button" aria-label={muted ? "Unmute riding video" : "Mute riding video"} onClick={() => setMuted(value => !value)}>{muted ? <FiVolumeX /> : <FiVolume2 />}</button>
        </div>
      </div>
    </div>
  </div>;
}

export function HomeOneFleet({ bikes }: { bikes: HomeBike[] }) {
  const track = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  if (!bikes.length) return <p className={s.empty}>No bikes to show right now. <Link href="/bikes">Explore the fleet</Link></p>;
  const scroll = (dir: -1 | 1) => {
    const node = track.current;
    if (!node) return;
    node.scrollBy({ left: dir * (node.clientWidth + 28), behavior: reduceMotion ? "instant" : "smooth" });
  };
  return <>
    <div className={s.bikeTrack} ref={track}>
      {bikes.map((bike, index) => {
        const price = bike.pricePerDay == null ? "Contact us" : new Intl.NumberFormat("en-US", { style: "currency", currency: bike.currency || "USD", maximumFractionDigits: 0 }).format(Number(bike.pricePerDay));
        const href = `/bikes/${bike.slug || bike.id}`;
        const book = `/booking?bike=${encodeURIComponent(bike.id)}&name=${encodeURIComponent(bike.name)}`;
        return <motion.article
          className={s.bikeCard}
          key={bike.id}
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.65, delay: Math.min(index, 3) * 0.06, ease: revealEase }}
        >
          <Link className={s.bikeCardPhoto} href={book} aria-label={`Book ${bike.name}`}>
            {bike.images[0] ? <img src={bike.images[0]} alt={bike.name} loading="lazy" /> : null}
            <span><span>Book Now<FiArrowUpRight /></span></span>
          </Link>
          <div className={s.bikeCardBody}>
            <h3><Link href={href}>{bike.name}</Link></h3>
            {bike.tagline && <p>{bike.tagline}</p>}
            {bike.features?.length > 0 && <ul>{bike.features.slice(0, 3).map((feature, idx) => <li key={`${feature}-${idx}`}>{feature}</li>)}</ul>}
            <div className={s.bikeCardPrice}>
              <span>{price}{bike.pricePerDay != null && <small>/ day</small>}</span>
              <Link href={href}>View Details</Link>
            </div>
          </div>
        </motion.article>;
      })}
    </div>
    <div className={s.bikeControls}>
      <div>
        <button type="button" aria-label="Previous bikes" onClick={() => scroll(-1)}><FiArrowLeft /></button>
        <button type="button" aria-label="Next bikes" onClick={() => scroll(1)}><FiArrowRight /></button>
      </div>
      <Link href="/bikes">View All<FiArrowUpRight /></Link>
    </div>
  </>;
}

const paddockSlides = [
  "img1.jpg", "img2.jpg", "img3.jpg", "img4.jpg", "img5.jpg", "img6.jpg",
  "img7.jpeg", "img8.jpeg", "img9.jpeg", "img10.jpeg", "img11.jpg", "img12.png", "img13.jpg",
].map(file => `/images/home/${file}`);

export function HomeOnePaddock() {
  const [slideStep, setSlideStep] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const swipeStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const reduceMotion = useReducedMotion();
  const slide = ((slideStep % paddockSlides.length) + paddockSlides.length) % paddockSlides.length;

  useEffect(() => {
    if (reduceMotion || swiping) return;
    const timer = window.setTimeout(() => setSlideStep(value => value + 1), 6500);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, slideStep, swiping]);

  return <section className={s.paddock} aria-labelledby="home-one-paddock">
    <div className={s.paddockCopy}>
      <h2 id="home-one-paddock">Your Paddock Pass to Pro-Level Motocross</h2>
      <p>MXSoCal brings the pro-factory paddock experience to every rider. Enjoy an elite fleet of bikes, VIP trackside support, and a zero-hassle guarantee. Stop wrenching and experience motocross at its peak.</p>
      <p className={s.pride}>We&apos;re proud to have</p>
      <p className={s.coachLine}>Legendary rider Ryan “Ryno” Hughes as our head coach, bringing unmatched technique and safe-riding knowledge at your fingertips.</p>
    </div>
    <div className={s.carousel} role="region" aria-roledescription="carousel" aria-label="MXSoCal gallery">
      <div
        className={s.carouselStage}
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0) return;
          swipeStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
          setSwiping(true);
        }}
        onPointerUp={event => {
          const start = swipeStart.current;
          if (!start || start.id !== event.pointerId) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) setSlideStep(value => value + (dx < 0 ? 1 : -1));
          swipeStart.current = null;
          setSwiping(false);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => { swipeStart.current = null; setSwiping(false); }}
        onLostPointerCapture={() => { swipeStart.current = null; setSwiping(false); }}
      >
        {paddockSlides.map((src, index) => {
          const position = index === slide ? s.active : index === (slide - 1 + paddockSlides.length) % paddockSlides.length ? s.previousSlide : index === (slide + 1) % paddockSlides.length ? s.nextSlide : "";
          return <img key={src} src={src} alt={index === slide ? `MXSoCal riding experience ${index + 1}` : ""} aria-hidden={index !== slide} className={position} loading={position ? "eager" : "lazy"} draggable={false} />;
        })}
      </div>
      <div className={s.carouselOrbit} aria-hidden="true">
        <svg viewBox="0 90 1000 100" preserveAspectRatio="none">
          <ellipse cx="500" cy="90" rx="480" ry="75" pathLength="1300" strokeDasharray="90 10" strokeDashoffset={-slideStep * 100} />
        </svg>
        <span />
      </div>
      <div className={s.carouselBar}>
        <span>{String(slide + 1).padStart(2, "0")}/{String(paddockSlides.length).padStart(2, "0")}</span>
        <div>
          <button type="button" aria-label="Previous image" onClick={() => setSlideStep(value => value - 1)}><FiArrowLeft /></button>
          <button type="button" aria-label="Next image" onClick={() => setSlideStep(value => value + 1)}><FiArrowRight /></button>
        </div>
      </div>
    </div>
  </section>;
}

export function HomeOneFounder() {

  return <section className={s.founder} aria-labelledby="home-one-founder">
    <div className={s.founderAurora} aria-hidden="true">
      <Aurora colorStops={["#7f1d1d", "#de2321", "#450a0a"]} amplitude={1.1} blend={0.55} speed={0.9} />
    </div>
    <div className={s.founderInner}>
      <p className={s.founderEyebrow}>Stay Tuned</p>
      <h2 id="home-one-founder">Become An <span className={s.brandAccent}>MXSoCal</span> Founder</h2>
      <p className={s.founderLead}>Get Founder&apos;s Access</p>
      <FooterContactForm founder className={s.founderForm} />
      <p className={s.founderNote}>We Will Not Share Your Information With Third Parties Or Send You Spam</p>
    </div>
  </section>;
}
