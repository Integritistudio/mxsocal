/* eslint-disable @next/next/no-img-element */
"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { FiArrowUpRight } from "react-icons/fi";
import { PiUser } from "react-icons/pi";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";
import CoachFilter from "./CoachFilter";
import ListingSkeleton, { ListingCountSkeleton } from "./ListingSkeleton";
import shared from "./contact-design.module.css";
import s from "./coaches-design.module.css";

type Coach = {
  id: string; firstName: string; lastName: string; bio: string | null; profileImage: string | null;
  specialty: string | null; experience: number | null; experienceLabel: string | null;
  skills: string[]; coachingLevels: string[]; dailyRate: string | null;
  imagePresentation: { height: number; top: number } | null;
};
type Filters = { level: string; specialty: string; budget: string };
type Result = { coaches: Coach[]; total: number; totalCoaches: number; hasMore: boolean; specialties: string[] };
const asset = (name: string) => `/images/coaches/${name}`;
const emptyFilters: Filters = { level: "", specialty: "", budget: "" };
export default function CoachesDesign() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [totalCoaches, setTotalCoaches] = useState(0);
  const [retry, setRetry] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const pageRef = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLDivElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ ...applied, page: String(page) });
      const response = await fetch(`/api/coaches?${params}`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 400 ? "Please check your filters and try again." : "We couldn’t load the coaches. Please try again.");
      const data: Result = await response.json();
      if (signal.aborted) return;
      setCoaches(previous => page === 1 ? data.coaches : [...previous, ...data.coaches.filter(coach => !previous.some(item => item.id === coach.id))]);
      setSpecialties(data.specialties); setHasMore(data.hasMore); setTotal(data.total); setTotalCoaches(data.totalCoaches);
    } catch (failure) {
      if (!signal.aborted) setError(failure instanceof Error ? failure.message : "Please try again shortly.");
    } finally { if (!signal.aborted) setLoading(false); }
  }, [applied, page]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load, retry]);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => { gsap.to(light.current, { x: 12, y: -8, duration: 14, repeat: -1, yoyo: true, ease: "sine.inOut" }); }, pageRef);
    return () => media.revert();
  }, []);
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setCoaches([]); setPage(1); setApplied({ ...filters });
  }
  return <div className={`${shared.page} ${s.page}`} ref={pageRef}>
    <a className={shared.skip} href="#main-content">Skip to content</a>
    <PublicSiteHeader activePath="/coaches" />
    <main id="main-content" className={s.main}>
      <h1 className={s.srOnly}>Meet Our Coaches</h1>
      <div className={s.light} ref={light} aria-hidden="true"><div><div><img src={asset("6e53c.svg")} alt="" width="2301.77" height="3977.04" /></div></div></div>
      <form className={s.filters} onSubmit={search} aria-label="Find a coach">
        <CoachFilter label="Skill level" value={filters.level} appliedValue={applied.level} onChange={level => setFilters({ ...filters, level })} options={[{ value: "", label: "Skill Level" }, ...["Beginner", "Intermediate", "Advanced"].map(level => ({ value: level, label: level }))]} />
        <CoachFilter label="Riding specialty" value={filters.specialty} appliedValue={applied.specialty} onChange={specialty => setFilters({ ...filters, specialty })} options={[{ value: "", label: "Riding Specialty" }, ...specialties.map(specialty => ({ value: specialty, label: specialty }))]} />
        <CoachFilter label="Maximum daily budget" value={filters.budget} appliedValue={applied.budget} onChange={budget => setFilters({ ...filters, budget })} options={[{ value: "", label: "Any Budget" }, ...[150, 200, 250, 300].map(budget => ({ value: String(budget), label: `Up to $${budget}/day` }))]} />
        <button type="submit" disabled={loading}><img src={asset("e437e.svg")} alt="" />{loading ? "Loading…" : "Search Coaches"}</button>
      </form>
      <p className={s.resultCount} role="status">{loading && coaches.length === 0 ? <ListingCountSkeleton label="Loading coaches" /> : error ? "" : <>Showing <strong>{coaches.length}</strong> of <strong>{total}</strong> {Object.values(applied).some(Boolean) ? <>matching coaches · <strong>{totalCoaches}</strong> coaches in total</> : "coaches"}</>}</p>
      <div className={s.results} ref={results} aria-busy={loading}>
        {loading && coaches.length === 0 && <ListingSkeleton variant="coach" />}
        {error && <div className={s.message} role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
        {!loading && !error && coaches.length === 0 && <div className={s.message}><h2>No coaches match those filters</h2><p>Try another skill level, specialty, or budget.</p><button type="button" onClick={() => { setFilters(emptyFilters); setApplied({ ...emptyFilters }); setPage(1); }}>Clear filters</button></div>}
        {coaches.map(coach => <motion.article key={coach.id} className={s.card} initial={false} whileInView={reduceMotion ? undefined : { y: [8, 0] }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
          <div className={s.portrait}>{coach.profileImage && !failedImages[coach.id] ? <img src={coach.profileImage} alt={`${coach.firstName} ${coach.lastName}`} loading="lazy" style={coach.imagePresentation ? { height: `${Math.max(100, Math.min(250, coach.imagePresentation.height))}%`, top: `${Math.max(-100, Math.min(0.1, coach.imagePresentation.top))}%` } : undefined} onError={() => setFailedImages(previous => ({ ...previous, [coach.id]: true }))} /> : <PiUser size={72} aria-label="Coach portrait unavailable" />}<a className={s.portraitOverlay} href={`/contact-us?coach=${encodeURIComponent(coach.id)}&name=${encodeURIComponent(`${coach.firstName} ${coach.lastName}`)}`} aria-label={`Book a session with ${coach.firstName} ${coach.lastName}`}><span>Book Now<FiArrowUpRight size={18} aria-hidden="true" /></span></a></div>
          <div className={s.coachInfo}><h2>{coach.firstName} {coach.lastName}</h2><dl><div><dt>Specialty:</dt><dd>{coach.specialty || coach.bio || "Motocross coaching"}</dd></div><div><dt>Experience:</dt><dd>{coach.experienceLabel || (coach.experience != null ? `${coach.experience} years riding and coaching` : "Contact us for details")}</dd></div></dl>{coach.skills?.length > 0 && <div className={s.skills}><h3>Skills:</h3><ul>{coach.skills.map(skill => <li key={skill}>{skill}</li>)}</ul></div>}<p className={s.level}>{coach.dailyRate != null ? `$${Number(coach.dailyRate).toFixed(0)} / day` : "Contact us for pricing"}</p><p className={s.level}>Coaching Level: {coach.coachingLevels?.length ? coach.coachingLevels.join(" → ") : "All levels"}</p></div>
          <a className={s.book} href={`/contact-us?coach=${encodeURIComponent(coach.id)}&name=${encodeURIComponent(`${coach.firstName} ${coach.lastName}`)}`}>Book Now<img src={asset("3f168.svg")} alt="" /></a>
        </motion.article>)}
        {loading && coaches.length > 0 && <ListingSkeleton variant="coach" count={Math.min(4, Math.max(1, total - coaches.length))} />}
      </div>
      {!error && hasMore && coaches.length > 0 && <button className={s.more} type="button" aria-label="Load more coaches" disabled={loading} onClick={() => setPage(value => value + 1)}><img src={asset("f9b65.svg")} alt="" /><img className={s.moreArrow} src={asset("f867f.svg")} alt="" /></button>}
    </main>
    <PublicSiteFooter />
  </div>;
}
