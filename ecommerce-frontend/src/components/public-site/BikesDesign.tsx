/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { FiArrowUpRight, FiX } from "react-icons/fi";
import { PiMotorcycle } from "react-icons/pi";
import CoachFilter from "./CoachFilter";
import ListingSkeleton, { ListingCountSkeleton } from "./ListingSkeleton";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";
import shared from "./contact-design.module.css";
import listing from "./coaches-design.module.css";
import s from "./bikes-design.module.css";

type Bike = {
  id: string; slug: string; name: string; brand: string | null; description: string | null; images: string[];
  pricePerDay: string | null; currency: string; tagline: string | null; features: string[];
  bikeSpec: { model: string | null; modelYear: number | null; engineCapacity: string | null; transmission: string | null; fuelType: string | null; seatHeight: number | null; weight: number | null; numberOfGears: number | null } | null;
};
type Filters = { brand: string; size: string; budget: string };
type Result = { bikes: Bike[]; total: number; totalBikes: number; hasMore: boolean; brands: string[]; sizes: string[] };
const empty: Filters = { brand: "", size: "", budget: "" };
const asset = (file: string) => `/images/bikes/${file}`;
const icons = ["bc9eb.png", "0498e.png", "3d332.png"];
const bookingUrl = (bike: Bike) => `/booking?bike=${encodeURIComponent(bike.id)}&name=${encodeURIComponent(bike.name)}`;
function price(bike: Bike) {
  if (bike.pricePerDay === null) return "Contact us";
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency: bike.currency || "USD", maximumFractionDigits: 0 }).format(Number(bike.pricePerDay)); }
  catch { return `$${Number(bike.pricePerDay).toFixed(0)}`; }
}
export default function BikesDesign({ initialSearch = "" }: { initialSearch?: string }) {
  const [filters, setFilters] = useState<Filters>(empty);
  const [applied, setApplied] = useState<Filters>(empty);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalBikes, setTotalBikes] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const breadcrumbs = useRef<HTMLElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    let frame = 0;
    const showBreadcrumbs = () => { frame = requestAnimationFrame(() => breadcrumbs.current?.scrollIntoView({ block: "start", behavior: "instant" })); };
    showBreadcrumbs();
    window.addEventListener("pageshow", showBreadcrumbs);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("pageshow", showBreadcrumbs); };
  }, [initialSearch]);
  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ ...applied, page: String(page), search: initialSearch });
      const response = await fetch(`/api/bikes?${params}`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 400 ? "Please check your filters and try again." : "We couldn’t load the bikes. Please try again shortly.");
      const data: Result = await response.json();
      if (signal.aborted) return;
      setBikes(previous => page === 1 ? data.bikes : [...previous, ...data.bikes.filter(bike => !previous.some(item => item.id === bike.id))]);
      setBrands(data.brands); setSizes(data.sizes); setTotal(data.total); setTotalBikes(data.totalBikes); setHasMore(data.hasMore);
    } catch (failure) { if (!signal.aborted) setError(failure instanceof Error ? failure.message : "Please try again shortly."); }
    finally { if (!signal.aborted) setLoading(false); }
  }, [applied, page, initialSearch]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load, retry]);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => { gsap.to(light.current, { x: 12, y: -8, duration: 14, repeat: -1, yoyo: true, ease: "sine.inOut" }); }, pageRef);
    return () => media.revert();
  }, []);
  function search(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setBikes([]); setPage(1); setApplied({ ...filters }); }
  return <div className={`${shared.page} ${listing.page}`} ref={pageRef}>
    <a className={shared.skip} href="#main-content">Skip to content</a>
    <PublicSiteHeader activePath="/bikes" />
    <main id="main-content" className={listing.main}>
      <nav ref={breadcrumbs} className={s.breadcrumbs} aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Bikes</span></nav>
      <h1 className={listing.srOnly}>Explore Our Bikes</h1>
      <div className={listing.light} ref={light} aria-hidden="true"><div><div><img src={asset("6e53c.svg")} alt="" width="2301.77" height="3977.04" /></div></div></div>
      <form className={listing.filters} onSubmit={search} aria-label="Find a bike">
        <CoachFilter label="Bike brand" value={filters.brand} appliedValue={applied.brand} onChange={brand => setFilters({ ...filters, brand })} options={[{ value: "", label: "Any Bike" }, ...brands.map(brand => ({ value: brand, label: brand }))]} />
        <CoachFilter label="Engine size" value={filters.size} appliedValue={applied.size} onChange={size => setFilters({ ...filters, size })} options={[{ value: "", label: "Any Size" }, ...sizes.map(size => ({ value: size, label: size }))]} />
        <CoachFilter label="Maximum daily budget" value={filters.budget} appliedValue={applied.budget} onChange={budget => setFilters({ ...filters, budget })} options={[{ value: "", label: "Any Budget" }, ...[100, 120, 140, 160, 200].map(budget => ({ value: String(budget), label: `Up to $${budget}/day` }))]} />
        <button type="submit" disabled={loading}><img src={asset("e437e.svg")} alt="" />{loading ? "Loading…" : "Search Bikes"}</button>
      </form>
      <div className={`${listing.resultCount} ${s.summary}`} role="status">{loading && !bikes.length ? <ListingCountSkeleton label="Loading bikes" /> : error ? "" : <span>Showing <strong>{bikes.length}</strong> of <strong>{total}</strong> {initialSearch || Object.values(applied).some(Boolean) ? <>matching bikes · <strong>{totalBikes}</strong> bikes in total</> : "bikes"}</span>}{initialSearch && <Link className={s.searchChip} href="/bikes" aria-label={`Clear search for ${initialSearch}`}>{initialSearch}<FiX size={14} aria-hidden="true" /></Link>}</div>
      <div className={listing.results} aria-busy={loading}>
        {loading && !bikes.length && <ListingSkeleton variant="bike" />}
        {error && <div className={listing.message} role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
        {!loading && !error && !bikes.length && <div className={listing.message}><h2>No bikes match those filters</h2><p>Try a different bike, engine size, or budget.</p>{initialSearch ? <Link className={s.clear} href="/bikes">Show all bikes</Link> : <button type="button" onClick={() => { setFilters(empty); setApplied({ ...empty }); setPage(1); }}>Clear filters</button>}</div>}
        {bikes.map(bike => <motion.article key={bike.id} className={listing.card} initial={false} whileInView={reduceMotion ? undefined : { y: [8, 0] }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
          <div className={listing.portrait}>{bike.images[0] && !failedImages[bike.id] ? <img src={bike.images[0]} alt={bike.name} loading="lazy" onError={() => setFailedImages(previous => ({ ...previous, [bike.id]: true }))} /> : <PiMotorcycle size={80} aria-label="Bike image unavailable" />}<Link className={listing.portraitOverlay} href={`/bikes/${bike.slug || bike.id}`} aria-label={`View details for ${bike.name}`}><span>View Details<FiArrowUpRight size={18} aria-hidden="true" /></span></Link></div>
          <div className={s.info}><h2>{bike.name}</h2><p className={s.tagline}>{bike.tagline}</p><div className={s.features}>{bike.features.map((feature, index) => <div key={`${feature}-${index}`}><img src={asset(icons[index])} alt="" width="36" height="36" /><span>{feature}</span></div>)}</div><div className={s.priceRow}><p className={s.price}><strong>{price(bike)}</strong>{bike.pricePerDay !== null && <span>/ day</span>}</p></div></div>
          <Link className={listing.book} href={bookingUrl(bike)}>Book Now<img src={asset("3f168.svg")} alt="" /></Link>
        </motion.article>)}
        {loading && bikes.length > 0 && <ListingSkeleton variant="bike" count={Math.min(4, Math.max(1, total - bikes.length))} />}
      </div>
      {!error && hasMore && bikes.length > 0 && <button className={listing.more} type="button" aria-label="Load more bikes" disabled={loading} onClick={() => setPage(value => value + 1)}><img src={asset("f9b65.svg")} alt="" /><img className={listing.moreArrow} src={asset("f867f.svg")} alt="" /></button>}
    </main>
    <PublicSiteFooter />
  </div>;
}

