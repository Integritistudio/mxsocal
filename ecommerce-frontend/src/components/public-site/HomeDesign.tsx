/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { useReducedMotion } from "framer-motion";
import { FiArrowLeft, FiArrowRight, FiArrowUpRight, FiSend, FiVolume2, FiVolumeX } from "react-icons/fi";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";
import { StoryCard } from "@/components/stories/StoriesView";
import type { Story } from "@/components/stories/types";
import shared from "./contact-design.module.css";
import storiesStyles from "@/components/stories/stories.module.css";
import s from "./home-design.module.css";

type Bike = {
  id: string; slug: string; name: string; images: string[];
  pricePerDay: string | null; currency: string; tagline: string | null; features: string[];
};
type Coach = {
  id: string; firstName: string; lastName: string; profileImage: string | null;
  specialty: string | null; skills: string[]; hourlyRate: string | null;
  experienceLabel: string | null; experience: number | null;
};

const carousel = [
  "img1.jpg", "img2.jpg", "img3.jpg", "img4.jpg", "img5.jpg", "img6.jpg",
  "img7.jpeg", "img8.jpeg", "img9.jpeg", "img10.jpeg", "img11.jpg", "img12.png", "img13.jpg",
].map(file => `/images/home/${file}`);

function money(amount: string | null, currency: string) {
  if (amount == null) return "Contact us";
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }).format(Number(amount)); }
  catch { return `$${Number(amount).toFixed(0)}`; }
}

async function loadAll<T>(path: string, key: "bikes" | "coaches", signal: AbortSignal): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore && page <= 20) {
    const response = await fetch(`${path}?page=${page}`, { signal, cache: "no-store" });
    if (!response.ok) throw new Error("unavailable");
    const data = await response.json();
    const batch = (data[key] || []) as T[];
    for (const item of batch) {
      const id = (item as { id: string }).id;
      if (!items.some(existing => (existing as { id: string }).id === id)) items.push(item);
    }
    hasMore = Boolean(data.hasMore);
    page += 1;
  }
  return items;
}

function ListingControls({ track, href, label }: { track: RefObject<HTMLDivElement | null>; href: string; label: string }) {
  const reduceMotion = useReducedMotion();
  const scroll = (dir: -1 | 1) => {
    const node = track.current;
    if (!node) return;
    node.scrollBy({ left: dir * (node.clientWidth + 28), behavior: reduceMotion ? "instant" : "smooth" });
  };
  return <div className={s.controls}>
    <div>
      <button type="button" aria-label={`Previous ${label}`} onClick={() => scroll(-1)}><FiArrowLeft /></button>
      <button type="button" aria-label={`Next ${label}`} onClick={() => scroll(1)}><FiArrowRight /></button>
    </div>
    <Link href={href}>View All<FiArrowUpRight /></Link>
  </div>;
}

function TrackSkeleton({ label, withButton = false }: { label: string; withButton?: boolean }) {
  return <div className={s.track} role="status" aria-busy="true" aria-label={label}>
    {Array.from({ length: 4 }, (_, index) => <div className={`${s.card} ${s.cardSkeleton}`} aria-hidden="true" key={index}>
      <div className={`${s.skel} ${s.skelPhoto}`} />
      <div className={s.cardBody}>
        <div className={`${s.skel} ${s.skelTitle}`} />
        <div className={`${s.skel} ${s.skelLine}`} />
        <div className={s.cardPrice}>
          <div className={`${s.skel} ${s.skelPrice}`} />
          <div className={`${s.skel} ${withButton ? s.skelButton : s.skelLink}`} />
        </div>
      </div>
    </div>)}
  </div>;
}

export default function HomeDesign({ stories }: { stories: Story[] }) {
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [bikeError, setBikeError] = useState("");
  const [coachError, setCoachError] = useState("");
  const [bikesLoading, setBikesLoading] = useState(true);
  const [coachesLoading, setCoachesLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [slideStep, setSlideStep] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const swipeStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const slide = ((slideStep % carousel.length) + carousel.length) % carousel.length;
  const video = useRef<HTMLVideoElement>(null);
  const bikeTrack = useRef<HTMLDivElement>(null);
  const coachTrack = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const controller = new AbortController();
    void loadAll<Bike>("/api/bikes", "bikes", controller.signal)
      .then(items => { if (!controller.signal.aborted) setBikes(items); })
      .catch(() => { if (!controller.signal.aborted) setBikeError("Bikes are temporarily unavailable."); })
      .finally(() => { if (!controller.signal.aborted) setBikesLoading(false); });
    void loadAll<Coach>("/api/coaches", "coaches", controller.signal)
      .then(items => { if (!controller.signal.aborted) setCoaches(items); })
      .catch(() => { if (!controller.signal.aborted) setCoachError("Coaches are temporarily unavailable."); })
      .finally(() => { if (!controller.signal.aborted) setCoachesLoading(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (reduceMotion || swiping) return;
    const timer = window.setTimeout(() => setSlideStep(value => value + 1), 6500);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, slideStep, swiping]);

  useEffect(() => {
    const node = video.current;
    if (!node) return;
    node.muted = muted;
    if (!muted) void node.play().catch(() => undefined);
  }, [muted]);

  function founderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email");
    const value = typeof email === "string" ? email.trim() : "";
    window.location.href = value ? `/contact-us?email=${encodeURIComponent(value)}` : "/contact-us";
  }

  return <div className={`${shared.page} ${s.page}`}>
    <a className={shared.skip} href="#main-content">Skip to content</a>
    <PublicSiteHeader activePath="/" compact />
    <main id="main-content" className={s.main}>
      <h1 className={s.srOnly}>MXSoCal — Dirt bike rentals and experiences in Southern California</h1>

      <section className={s.videoHero} aria-label="MXSoCal riding experience">
        <img className={`${s.videoPoster}${videoReady ? ` ${s.videoPosterHidden}` : ""}`} src="/images/contact/b541a.png" alt="" aria-hidden="true" />
        <video
          ref={video}
          className={videoReady ? s.videoReady : s.videoLoading}
          src="/videos/herosection.mp4"
          poster="/images/contact/b541a.png"
          autoPlay
          muted
          loop
          playsInline
          controls={false}
          disablePictureInPicture
          preload="auto"
          onLoadedData={() => setVideoReady(true)}
          onPlaying={() => setVideoReady(true)}
          onError={() => setVideoReady(false)}
        />
        <div className={s.veil} aria-hidden="true" />
        <button className={s.sound} type="button" aria-label={muted ? "Unmute video" : "Mute video"} onClick={() => setMuted(value => !value)}>
          <span className={s.soundIcon} aria-hidden="true">{muted ? <FiVolumeX size={24} /> : <FiVolume2 size={24} />}</span>
          <span className={s.soundLabel}>Sound</span>
        </button>
      </section>

      <section className={s.section} aria-labelledby="home-bikes-heading">
        <div className={s.sectionHead}>
          <h2 id="home-bikes-heading">Bike Rentals</h2>
          <Link href="/bikes">Explore all bikes<FiArrowUpRight /></Link>
        </div>
        {bikeError ? <div className={s.empty} role="status">{bikeError}</div> : bikesLoading ? <TrackSkeleton label="Loading bikes" /> : !bikes.length ? <div className={s.empty} role="status">No bikes available right now.</div> : <>
          <div className={s.track} ref={bikeTrack}>
            {bikes.map(bike => <article className={s.card} key={bike.id}>
              <Link className={`${s.cardPhoto} ${s.bikePhoto}`} href={`/booking?bike=${encodeURIComponent(bike.id)}&name=${encodeURIComponent(bike.name)}`} aria-label={`Book ${bike.name}`}>
                {bike.images[0] ? <img src={bike.images[0]} alt={bike.name} loading="lazy" /> : null}
                <span><span>Book Now<FiArrowUpRight /></span></span>
              </Link>
              <div className={s.cardBody}>
                <h3><Link href={`/bikes/${bike.slug || bike.id}`}>{bike.name}</Link></h3>
                {bike.tagline && <p>{bike.tagline}</p>}
                {bike.features?.length > 0 && <ul className={s.cardMeta}>{bike.features.slice(0, 3).map((feature, index) => <li key={`${feature}-${index}`}>{feature}</li>)}</ul>}
                <div className={s.cardPrice}>
                  <span>{money(bike.pricePerDay, bike.currency)}{bike.pricePerDay != null && <small>/ day</small>}</span>
                  <Link href={`/bikes/${bike.slug || bike.id}`}>View Details</Link>
                </div>
              </div>
            </article>)}
          </div>
          <ListingControls track={bikeTrack} href="/bikes" label="bikes" />
        </>}
      </section>

      <section className={s.about} aria-labelledby="home-about-heading">
        <div>
          <h2 id="home-about-heading">About Us</h2>
          <h3>Where Off-Road Passion, Quality Craftsmanship and Rider Trust Come Together</h3>
        </div>
        <div className={s.aboutCopy}>
          <p>At MXSoCal, we’re more than a dirt bike store, we’re a community built by riders, for riders. What started as a simple love for off-road freedom has grown into a dedicated hub for high-performance bikes, premium gear and an unmatched riding experience. Every product we offer is carefully selected to ensure riders get the perfect balance of power, durability and safety, no matter where the trail leads.</p>
          <p>Whether you&apos;re just starting out or pushing limits on the track, we’re here to support your journey. From reliable bikes to top-tier gear. We deliver products and service that help riders get more out of every adventure.</p>
        </div>
      </section>

      <section className={s.section} aria-labelledby="home-coaches-heading">
        <div className={s.sectionHead}>
          <h2 id="home-coaches-heading">Our Coaches</h2>
          <Link href="/coaches">Meet the team<FiArrowUpRight /></Link>
        </div>
        {coachError ? <div className={s.empty} role="status">{coachError}</div> : coachesLoading ? <TrackSkeleton label="Loading coaches" withButton /> : !coaches.length ? <div className={s.empty} role="status">No coaches available right now.</div> : <>
          <div className={s.track} ref={coachTrack}>
            {coaches.map(coach => {
              const name = `${coach.firstName} ${coach.lastName}`.trim();
              const book = `/contact-us?coach=${encodeURIComponent(coach.id)}&name=${encodeURIComponent(name)}`;
              return <article className={s.card} key={coach.id}>
                <Link className={`${s.cardPhoto} ${s.coachPhoto}`} href={book} aria-label={`Book a session with ${name}`}>
                  {coach.profileImage ? <img className={s.coachPortrait} src={coach.profileImage} alt={name} loading="lazy" /> : null}
                  <span><span>Book Now<FiArrowUpRight /></span></span>
                </Link>
                <div className={s.cardBody}>
                  <h3><Link href="/coaches">{name}</Link></h3>
                  <p>{coach.specialty || coach.experienceLabel || (coach.experience != null ? `${coach.experience} years coaching` : "Motocross coaching")}</p>
                  <div className={s.cardPrice}>
                    <span>{money(coach.hourlyRate, "USD")}{coach.hourlyRate != null && <small>/ hour</small>}</span>
                    <Link className={s.coachBtn} href={book} aria-label={`Book a session with ${name}`}>
                      <span className={s.coachBtnIdle}>Book Session</span>
                      <span className={s.coachBtnHover}>View Details</span>
                    </Link>
                  </div>
                </div>
              </article>;
            })}
          </div>
          <ListingControls track={coachTrack} href="/coaches" label="coaches" />
        </>}
      </section>

      <section className={s.paddock} aria-labelledby="home-paddock-heading">
        <div className={s.paddockCopy}>
          <h2 id="home-paddock-heading">Your Paddock Pass to Pro-Level Motocross</h2>
          <p>MXSoCal brings the pro-factory paddock experience to every rider. Enjoy an elite fleet of bikes, VIP trackside support, and a zero-hassle guarantee. Stop wrenching and experience motocross at its peak.</p>
          <p className={s.pride}>We&apos;re proud to have</p>
          <p className={s.coachLine}>Legendary rider Ryan “Ryno” Hughes as our head coach, bringing unmatched technique and safe-riding knowledge at your fingertips.</p>
        </div>
        <div className={s.carousel} role="region" aria-roledescription="carousel" aria-label="MXSoCal gallery">
          <div className={s.carouselStage}
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
              if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) {
                setSlideStep(value => value + (dx < 0 ? 1 : -1));
              }
              swipeStart.current = null;
              setSwiping(false);
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={() => { swipeStart.current = null; setSwiping(false); }}
            onLostPointerCapture={() => { swipeStart.current = null; setSwiping(false); }}
          >
            {carousel.map((src, index) => {
              const position = index === slide ? s.active : index === (slide - 1 + carousel.length) % carousel.length ? s.previousSlide : index === (slide + 1) % carousel.length ? s.nextSlide : "";
              return <Image key={src} src={src} width={350} height={500} sizes="(max-width: 650px) 270px, 350px" alt={index === slide ? `MXSoCal riding experience ${index + 1}` : ""} aria-hidden={index !== slide} className={position} loading={position ? "eager" : "lazy"} draggable={false} />;
            })}
          </div>
          <div className={s.carouselOrbit} aria-hidden="true">
            <svg viewBox="0 90 1000 100" preserveAspectRatio="none">
              <ellipse cx="500" cy="90" rx="480" ry="75" pathLength="1300" strokeDasharray="90 10" strokeDashoffset={-slideStep * 100} />
            </svg>
            <span />
          </div>
          <div className={s.carouselBar}>
            <span>{String(slide + 1).padStart(2, "0")}/{String(carousel.length).padStart(2, "0")}</span>
            <div>
              <button type="button" aria-label="Previous image" onClick={() => setSlideStep(value => value - 1)}><FiArrowLeft /></button>
              <button type="button" aria-label="Next image" onClick={() => setSlideStep(value => value + 1)}><FiArrowRight /></button>
            </div>
          </div>
        </div>
      </section>

      <section className={s.founder} aria-labelledby="home-founder-heading">
        <p className={s.eyebrow}>Stay Tuned</p>
        <h2 id="home-founder-heading">Become An <span className={s.brandAccent}>MXSoCal</span> Founder</h2>
        <p className={s.founderLead}>Get Founder&apos;s Access</p>
        <form className={s.founderForm} onSubmit={founderSubmit}>
          <input name="email" type="email" required placeholder="Your Email Address" aria-label="Your email address" autoComplete="email" />
          <button type="submit" aria-label="Get founder&apos;s access"><FiSend size={16} aria-hidden="true" /></button>
        </form>
        <p className={s.founderNote}>We Will Not Share Your Information With Third Parties Or Send You Spam</p>
      </section>

      {stories.length > 0 && <section className={s.stories} aria-labelledby="home-stories-heading">
        <div className={s.sectionHead}>
          <h2 id="home-stories-heading">Our Stories</h2>
          <Link href="/stories">All Stories<FiArrowUpRight /></Link>
        </div>
        <div className={`${storiesStyles.grid} ${s.storiesGrid}`}>{stories.map(story => <StoryCard story={story} key={story.id} />)}</div>
      </section>}
    </main>
    <PublicSiteFooter />
  </div>;
}
