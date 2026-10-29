import Link from "next/link";
import DetailBreadcrumbs from "./DetailBreadcrumbs";
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
      <DetailBreadcrumbs className={p.breadcrumb} pageKey={track.id}><Link href="/">Home</Link><span>/</span><Link href="/tracks">Tracks</Link><span>/</span><span>{track.name}</span></DetailBreadcrumbs>
      <div className={p.titleRow}><div><span className={s.eyebrow}>{track.city.toUpperCase()} / CALIFORNIA</span><h1>{track.name}</h1><p>{track.tagline}</p></div><Link className={s.back} href="/tracks">All tracks <FiArrowUpRight /></Link></div>
      <ul className={p.badges}>{track.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
      <TrackGallery track={track} />
      {track.imageSource && <p className={s.photoCredits}>Photos: {track.imageSource}</p>}
      <div className={p.bodyGrid}><div className={p.content}>
        <section className={p.section}><h2>Track Overview</h2><dl className={s.overview}><div><dt>Location</dt><dd>{track.city}, California</dd></div><div><dt>Discipline</dt><dd>Outdoor motocross</dd></div><div><dt>Track layouts</dt><dd>{track.layouts.join(", ")}</dd></div><div><dt>Venue</dt><dd>{track.name}</dd></div></dl></section>
        <section className={p.section}><h2>The riding experience</h2><p>{track.description}</p></section>
        <section className={`${p.section} ${p.location}`}><h2>Location</h2><p>{track.address}</p><a href={directions} target="_blank" rel="noreferrer">Get Directions <FiArrowUpRight /></a><iframe src={`https://maps.google.com/maps?q=${encodeURIComponent(track.address)}&output=embed`} title={`${track.name} location map`} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" /></section>
      </div><aside className={p.booking}><a className={p.outlineButton} href={directions} target="_blank" rel="noreferrer">Get Directions <FiMapPin /></a>{track.website && <a className={p.outlineButton} href={track.website} target="_blank" rel="noopener noreferrer">Official website <FiArrowUpRight /></a>}<Link className={p.outlineButton} href="/bikes">Find Your Bike <FiArrowUpRight /></Link></aside></div>
      <div className={s.endcap}><h2>New track. Next adventure.</h2><Link className={p.primaryButton} href="/tracks">Explore All Tracks <FiArrowUpRight /></Link></div>
    </main><PublicSiteFooter />
  </div>;
}
