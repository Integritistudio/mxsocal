import Link from "next/link";
import { FiArrowUpRight, FiMapPin } from "react-icons/fi";
import type { Track, TrackAvailability } from "@/lib/tracks";
import TrackGallery from "./TrackGallery";
import TrackCalendar from "./TrackCalendar";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";
import shared from "./contact-design.module.css";
import p from "./product-design.module.css";
import s from "./tracks-design.module.css";
export default function TrackDetail({ track, availabilityMonths }: { track: Track; availabilityMonths?: TrackAvailability[] }) {
  const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(track.address)}`;
  return <div className={`${shared.page} ${p.page}`}>
    <a href="#main-content" className={shared.skip}>Skip to content</a><PublicSiteHeader activePath="/tracks" />
    <main id="main-content" className={p.main}>
      <div className={p.glow} aria-hidden="true" />
      <nav className={p.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/tracks">Tracks</Link><span>/</span><span>{track.name}</span></nav>
      <div className={p.titleRow}><div><span className={s.eyebrow}>{track.city.toUpperCase()} / CALIFORNIA</span><h1>{track.name}</h1><p>{track.tagline}</p></div><Link className={s.back} href="/tracks">All tracks <FiArrowUpRight /></Link></div>
      <ul className={p.badges}>{track.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
      <TrackGallery track={track} />
      <div className={p.bodyGrid}><div className={p.content}>
        <section className={p.section}><h2>Track Overview</h2><dl className={s.overview}><div><dt>Location</dt><dd>{track.city}, California</dd></div><div><dt>Discipline</dt><dd>Outdoor motocross</dd></div><div><dt>Track layouts</dt><dd>{track.layouts.join(", ")}</dd></div><div><dt>Venue</dt><dd>{track.name}</dd></div></dl></section>
        <section className={p.section}><h2>The riding experience</h2><p>{track.description}</p></section>
        <section className={p.section}><h2>Choose your next lap</h2><div className={s.layouts}>{track.layouts.map((layout, index) => <div key={layout}><span>0{index + 1}</span><h3>{layout} Track</h3></div>)}</div><p className={s.note}>Check with the venue for current layouts, riding groups and practice availability.</p></section>
        <section id="track-availability" className={`${p.section} ${s.availabilitySection}`}><h2>Track Availability</h2><TrackCalendar calendars={availabilityMonths} /></section>
        <section className={`${p.section} ${p.location}`}><h2>Location</h2><p>{track.address}</p><a href={directions} target="_blank" rel="noreferrer">Get Directions <FiArrowUpRight /></a><iframe src={`https://maps.google.com/maps?q=${encodeURIComponent(track.address)}&output=embed`} title={`${track.name} location map`} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" /></section>
      </div><aside className={p.booking}><a className={p.primaryButton} href="#track-availability">Check Availability <FiArrowUpRight /></a><a className={p.outlineButton} href={directions} target="_blank" rel="noreferrer">Get Directions <FiMapPin /></a><p>Plan your track day<br />View this month’s track availability below.</p><Link className={p.outlineButton} href="/bikes">Find Your Bike <FiArrowUpRight /></Link></aside></div>
      <div className={s.endcap}><h2>New track. Next adventure.</h2><Link className={p.primaryButton} href="/tracks">Explore All Tracks <FiArrowUpRight /></Link></div>
    </main><PublicSiteFooter />
  </div>;
}
