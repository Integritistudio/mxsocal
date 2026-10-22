/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FiArrowUpRight, FiFlag, FiMapPin, FiLayers } from "react-icons/fi";
import type { Track } from "@/lib/tracks";
import CoachFilter from "./CoachFilter";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";
import shared from "./contact-design.module.css";
import listing from "./coaches-design.module.css";
import bike from "./bikes-design.module.css";
import s from "./tracks-design.module.css";
import glow from "./ambient-glow.module.css";

export function TrackPhoto({ track, eager = false }: { track: Track; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  return !failed && track.images[0] ? <img src={track.images[0]} alt={`${track.name} motocross track`} loading={eager ? "eager" : "lazy"} onError={() => setFailed(true)} /> : <div className={s.photoFallback}><FiFlag size={50} /><span>{track.name}</span></div>;
}
export default function TracksDesign({ tracks }: { tracks: Track[] | null }) {
  const [city, setCity] = useState("");
  const [layout, setLayout] = useState("");
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState({ city: "", layout: "", query: "" });
  const visible = (tracks || []).filter(track => (!applied.city || track.city === applied.city) && (!applied.layout || track.layouts.includes(applied.layout)) && `${track.name} ${track.city}`.toLowerCase().includes(applied.query.toLowerCase()));
  function search(event: FormEvent) { event.preventDefault(); setApplied({ city, layout, query: query.trim() }); }
  function clear() { setCity(""); setLayout(""); setQuery(""); setApplied({ city: "", layout: "", query: "" }); }
  return <div className={`${shared.page} ${listing.page}`}>
    <a href="#main-content" className={shared.skip}>Skip to content</a><PublicSiteHeader activePath="/tracks" />
    <main id="main-content" className={`${listing.main} ${s.main} ${glow.surface}`}>
      <header className={s.intro}><span className={s.eyebrow}>SOUTHERN CALIFORNIA / MOTOCROSS</span><h1>Find your next <span>track.</span></h1><p>From your first laps to your next race. Explore five SoCal riding destinations.</p></header>
      <form className={listing.filters} onSubmit={search} aria-label="Find a track">
        <CoachFilter label="Track location" value={city} appliedValue={applied.city} onChange={setCity} options={[{ value: "", label: "Any Location" }, ...Array.from(new Set((tracks || []).map(t => t.city))).map(value => ({ value, label: value }))]} />
        <CoachFilter label="Track layout" value={layout} appliedValue={applied.layout} onChange={setLayout} options={[{ value: "", label: "Any Track" }, ...Array.from(new Set((tracks || []).flatMap(t => t.layouts))).map(value => ({ value, label: value }))]} />
        <div className={listing.filterField}><input className={s.search} aria-label="Search track name" placeholder="Search tracks" value={query} onChange={e => setQuery(e.target.value)} /></div>
        <button type="submit">Search Tracks <FiArrowUpRight /></button>
      </form>
      <div className={listing.resultCount} role="status">Showing <strong>{visible.length}</strong> of <strong>{tracks?.length || 0}</strong> tracks</div>
      <div className={listing.results}>
        {tracks === null ? <div className={listing.message}><h2>Tracks are temporarily unavailable</h2><p>Please try again shortly.</p><button onClick={() => window.location.reload()}>Try again</button></div> : !visible.length ? <div className={listing.message}><h2>No tracks match your search</h2><p>Try another location or track layout.</p><button onClick={clear}>Clear filters</button></div> : visible.map(track => <article key={track.slug} className={listing.card}>
          <div className={listing.portrait}><TrackPhoto track={track} /><Link className={listing.portraitOverlay} href={`/tracks/${track.slug}`} aria-label={`Explore ${track.name}`}><span>Explore Track <FiArrowUpRight /></span></Link></div>
          <div className={bike.info}><span className={s.location}><FiMapPin />{track.city}, California</span><h2><Link href={`/tracks/${track.slug}`}>{track.name}</Link></h2><p className={bike.tagline}>{track.tagline}</p><div className={bike.features}>{track.features.map((feature, index) => <div key={feature}>{index === 0 ? <FiFlag size={30} /> : index === 1 ? <FiLayers size={30} /> : <FiMapPin size={30} />}<span>{feature}</span></div>)}</div><div className={bike.priceRow}><p className={s.layoutSummary}>{track.layouts.join(" / ")}</p><Link className={bike.detailsLink} href={`/tracks/${track.slug}`}>View Details</Link></div></div>
          <Link className={listing.book} href={`/tracks/${track.slug}`}>Explore Track <FiArrowUpRight /></Link>
        </article>)}
      </div>
    </main><PublicSiteFooter />
  </div>;
}
