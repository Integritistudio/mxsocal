/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { useState } from "react";
import { FiArrowUpRight, FiAward, FiCheck, FiClock, FiShare2, FiTarget, FiUsers } from "react-icons/fi";
import { PiUser } from "react-icons/pi";
import type { PublicCoach } from "@/lib/public-coach";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";
import shared from "./contact-design.module.css";
import s from "./product-design.module.css";
import c from "./coach-detail.module.css";

const levelDescriptions: Record<string, string> = {
  Beginner: "Build your foundation. Discuss bike control, riding position, and the skills you want to feel more comfortable with.",
  Intermediate: "Find your next step. Talk through technique, consistency, and the areas of your riding you want to refine.",
  Advanced: "Focus your progression. Discuss specific riding goals and the technical skills you want to develop further.",
};
export default function CoachDetail({ coach }: { coach: PublicCoach }) {
  const [failedImage, setFailedImage] = useState(false);
  const [notice, setNotice] = useState("");
  const name = `${coach.firstName} ${coach.lastName}`;
  const inquiry = `/contact-us?coach=${encodeURIComponent(coach.id)}&name=${encodeURIComponent(name)}`;
  const rate = coach.dailyRate != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(coach.dailyRate)) : null;
  const experience = coach.experienceLabel || (coach.experience != null ? `${coach.experience} years riding and coaching` : "Ask about experience");
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: `${name} | MXSoCal`, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); setNotice("Profile link copied."); }
    } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setNotice("Share this profile using the page URL."); }
  }
  return <div className={`${shared.page} ${s.page}`}>
    <a href="#main-content" className={shared.skip}>Skip to content</a>
    <PublicSiteHeader activePath="/coaches" />
    <main id="main-content" className={s.main}>
      <div className={s.glow} aria-hidden="true" />
      <nav className={s.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/coaches">Coaches</Link><span>/</span><span aria-current="page">{name}</span></nav>
      <div className={s.titleRow}>
        <div><p className={c.eyebrow}>MEET YOUR COACH</p><h1>{name}</h1><p>{coach.specialty || "Motocross coaching"}</p></div>
        <div className={s.titleActions}><div><button type="button" onClick={share}><span><FiShare2 /></span>Share profile</button></div><strong>{rate || "Let’s talk"}{rate && <small> / day</small>}</strong></div>
      </div>
      <p role="status" className={s.notice}>{notice}</p>
      <ul className={s.badges}>
        {coach.specialty && <li><FiTarget aria-hidden="true" />{coach.specialty}</li>}
        {coach.experience != null && <li><FiAward aria-hidden="true" />{coach.experience} years of experience</li>}
        {(coach.coachingLevels || []).map(level => <li key={level}><FiCheck aria-hidden="true" />{level}</li>)}
      </ul>
      <div className={c.hero}>
        <div className={c.portrait}>{coach.profileImage && !failedImage ? <img src={coach.profileImage} alt={name} onError={() => setFailedImage(true)} style={coach.imagePresentation ? { height: `${coach.imagePresentation.height}%`, top: `${coach.imagePresentation.top}%` } : undefined} /> : <div className={s.fallback}><PiUser size={80} aria-hidden="true" /><span>{name}</span></div>}</div>
        <div className={c.heroCopy}><span className={c.eyebrow}>YOUR NEXT STEP STARTS HERE</span><h2>A coach for<br />your next chapter.</h2><p>Explore {coach.firstName}’s background and coaching focus, then talk with our team about your riding goals.</p><Link className={s.primaryButton} href={inquiry}>Inquire about coaching<FiArrowUpRight /></Link><div className={c.heroFoot}><FiUsers aria-hidden="true" /><span>{coach.coachingLevels?.length ? `For ${coach.coachingLevels.join(", ").toLowerCase()} riders` : "Talk to us about your riding level"}</span></div></div>
      </div>
      <div className={s.bodyGrid}>
        <div className={s.content}>
          <section className={s.section}><h2>Coaching Overview</h2><dl className={c.overview}>
            {[{ icon: <FiTarget />, label: "Specialty", value: coach.specialty || "Motocross coaching" }, { icon: <FiAward />, label: "Experience", value: experience }, { icon: <FiUsers />, label: "Rider levels", value: coach.coachingLevels?.join(", ") || "Discuss with our team" }, { icon: <FiClock />, label: "Daily rate", value: rate ? `${rate} / day` : "Contact us for pricing" }].map(item => <div key={item.label}><dt>{item.icon}{item.label}</dt><dd>{item.value}</dd></div>)}
          </dl></section>
          <section className={s.section}><h2>About {coach.firstName}</h2><div className={s.description}>{coach.bio ? coach.bio.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p className={c.bio} key={index}>{paragraph}</p>) : <p>Get to know {coach.firstName} and find out how their coaching focus fits your riding goals. Our team can help you choose the right next step.</p>}</div></section>
          {!!coach.skills?.length && <section className={s.section}><h2>Skills &amp; Coaching Focus</h2><p className={c.intro}>Areas to explore with {coach.firstName}.</p><ul className={c.skills}>{coach.skills.map((skill, index) => <li key={skill}><span>{String(index + 1).padStart(2, "0")}</span><strong>{skill}</strong><FiArrowUpRight aria-hidden="true" /></li>)}</ul></section>}
          {!!coach.coachingLevels?.length && <section className={s.section}><h2>Find Your Level</h2><div className={c.levels}>{coach.coachingLevels.map(level => <article key={level}><FiUsers aria-hidden="true" /><h3>{level}</h3><p>{levelDescriptions[level] || "Talk with our team about coaching for your current riding level."}</p></article>)}</div></section>}
          <section className={`${s.section} ${c.nextStep}`}><span className={c.eyebrow}>LET’S PLAN YOUR PROGRESSION</span><h2>Tell us where you want to go.</h2><p>Share your experience, preferred dates, and what you’d like to work on. Our team will help confirm availability and the details of your coaching session.</p><Link className={s.primaryButton} href={inquiry}>Talk to our team<FiArrowUpRight /></Link></section>
        </div>
        <aside className={`${s.booking} ${c.booking}`} aria-label="Coaching inquiry"><div className={c.bookingHeading}><span>COACH WITH {coach.firstName.toUpperCase()}</span><strong>{rate || "Let’s plan your session"}{rate && <small> / day</small>}</strong></div><Link className={s.primaryButton} href={inquiry}>Inquire Now<FiArrowUpRight /></Link><Link className={s.outlineButton} href="/coaches">Explore All Coaches<FiUsers /></Link><p>Have a question about your skill level?<br />Our team is here to help.</p></aside>
      </div>
      <div className={c.back}><Link href="/coaches">Meet all our coaches<FiArrowUpRight /></Link></div>
    </main><PublicSiteFooter />
  </div>;
}
