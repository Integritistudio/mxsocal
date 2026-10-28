/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiCheck, FiImage, FiPackage, FiPlus, FiTrash2, FiPause, FiPlay } from "react-icons/fi";
import { useUser } from "@/context/UserContext";
import { buddyDetailsError, buddyDetailsValid, rideRequest, rideMoney, type RideCatalog, type RideDraft, type RideEstimate, type Rider, type RideProduct, type RideRequest } from "@/services/ride-requests";
import BookingDatePicker from "./BookingDatePicker";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";
import shared from "./contact-design.module.css";
import s from "./ride-booking.module.css";
const steps = ["Bike & dates", "Buddies", "Track", "Gear", "Coach", "Review"];
const emptyRider = (): Rider => ({ name: "", email: "", phone: "", age: "", heightCm: "", weightKg: "", bikeId: "", wantsGear: false, gear: [] });
const initialDraft = (): RideDraft => ({ trackId: "", startDate: "", endDate: "", riders: [emptyRider()], coachId: null, coachMode: "group", notes: "" });
const dateLabel = (date: string) => date ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)) : "Choose dates";
export default function RideBookingFlow() {
  const { user, loadingAuth } = useUser(); const params = useSearchParams(); const requestedBike = params.get("bike") || "";
  const [draft, setDraft] = useState<RideDraft>(initialDraft); const [step, setStep] = useState(0); const [activeRider, setActiveRider] = useState(0);
  const [catalog, setCatalog] = useState<RideCatalog | null>(null); const [loading, setLoading] = useState(true); const [error, setErrorState] = useState(""); const [revision, setRevision] = useState(0);
  const [notes, setNotes] = useState("");
  const [errorRefresh, setErrorRefresh] = useState(false);
  const errorBox = useRef<HTMLDivElement>(null);
  const [coachRider, setCoachRider] = useState(0);
  const [changingBike, setChangingBike] = useState(false);
  const [estimate, setEstimate] = useState<RideEstimate | null>(null); const [quoting, setQuoting] = useState(false); const [accepted, setAccepted] = useState(false); const [busy, setBusy] = useState(false); const [submitted, setSubmitted] = useState<RideRequest | null>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const showVideo = !loadingAuth && (!user || !!submitted);
  const backdrop = useRef<HTMLVideoElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  useEffect(() => {
    if (!showVideo) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPlayback = () => {
      if (preference.matches) backdrop.current?.pause();
      else void backdrop.current?.play().catch(() => {});
    };
    syncPlayback();
    preference.addEventListener("change", syncPlayback);
    return () => preference.removeEventListener("change", syncPlayback);
  }, [showVideo]);
  useEffect(() => {
    if (!submitted) return;
    requestAnimationFrame(() => { successHeading.current?.focus({ preventScroll: true }); successHeading.current?.scrollIntoView({ block: "center" }); });
  }, [submitted]);
  const stepsNav = useRef<HTMLElement>(null);
  const initialBikeChecked = useRef(false); const clientKey = useRef(""); const introHeading = useRef<HTMLHeadingElement>(null); const actionLock = useRef(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
  }, []);
  const validRange = !!draft.startDate && draft.endDate > draft.startDate;
  useEffect(() => {
    const controller = new AbortController();
    const query = validRange ? `?startDate=${draft.startDate}&endDate=${draft.endDate}` : "";
    void rideRequest<RideCatalog>(`catalog${query}`, "GET", undefined, controller.signal).then(data => {
      setCatalog(data); setLoading(false); setError("");
      if (!initialBikeChecked.current) {
        initialBikeChecked.current = true;
        const bike = data.bikes.find(b => b.id === requestedBike) || data.bikes[0];
        if (bike) setDraft(previous => ({ ...previous, riders: previous.riders.map((rider, i) => i ? rider : { ...rider, bikeId: bike.id }) }));
      }
    }).catch(err => { if (!controller.signal.aborted) { setError(err.message, true); setLoading(false); } });
    return () => controller.abort();
  }, [draft.startDate, draft.endDate, validRange, requestedBike, user?.id, revision]);
  useEffect(() => {
    if (step !== 5 || !user) return;
    const controller = new AbortController();
    void rideRequest<{ estimate: RideEstimate }>("quote", "POST", draft, controller.signal).then(data => { setEstimate(data.estimate); setQuoting(false); }).catch(err => { if (!controller.signal.aborted) { setError(err.message, /unavailable|availability|no longer available|not enough|estimate changed|prices changed/i.test(err.message)); setQuoting(false); } });
    return () => controller.abort();
  }, [step, draft, user, revision]);
  const rider = draft.riders[activeRider] || draft.riders[0];
  const riderLabel = (i: number) => i === 0 ? "You" : draft.riders[i].name || `Buddy ${i}`;
  const needsCoach = catalog?.needsCoach !== false || draft.riders.length > 1;
  function setError(message: string, refreshAvailability = false) {
    setErrorState(message);
    setErrorRefresh(!!message && refreshAvailability);
    if (message) requestAnimationFrame(() => { errorBox.current?.focus({ preventScroll: true }); errorBox.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" }); });
  }
  const rangeDates = validRange ? Array.from({ length: Math.min(62, Math.round((Date.parse(draft.endDate) - Date.parse(draft.startDate)) / 86400000) + 1) }, (_, i) => new Date(Date.parse(`${draft.startDate}T12:00:00Z`) + i * 86400000).toISOString().slice(0, 10)) : [];
  const primaryBike = catalog?.bikes.find(b => b.id === draft.riders[0].bikeId);
  const rangeAvailable = !!primaryBike && !!catalog && draft.startDate > catalog.today && rangeDates.length >= 2 && rangeDates.every(date => primaryBike.availableDates.includes(date));
  function updateRider(update: Partial<Rider>) { setDraft(previous => ({ ...previous, riders: previous.riders.map((r, i) => i === activeRider ? { ...r, ...update } : r) })); setEstimate(null); setError(""); }
  function setGearPreference(index: number, enabled: boolean) {
    setDraft(previous => ({ ...previous, riders: previous.riders.map((r, i) => i === index ? { ...r, wantsGear: enabled, gear: enabled ? r.gear : [] } : r) }));
    setActiveRider(index); setEstimate(null); setError("");
  }
  function changeDates(startDate: string, endDate: string) {
    setLoading(true); setEstimate(null); setDraft(previous => ({ ...previous, startDate, endDate, trackId: null, coachId: null, riders: previous.riders.map(r => ({ ...r, coachId: null, wantsGear: false, gear: [] })) }));
  }

  function taken(productId: string, excludeCurrent = true) { return draft.riders.reduce((sum, r, i) => sum + (excludeCurrent && i === activeRider ? 0 : (r.bikeId === productId ? 1 : 0) + r.gear.filter(g => g.productId === productId).length), 0); }
  function chooseGear(product: RideProduct) {
    const selected = rider.gear.some(g => g.productId === product.id);
    if (!selected && catalog?.gearDailyAmount == null) return;
    const gear = rider.gear.filter(g => { const p = catalog?.products.find(p => p.id === g.productId); return g.productId !== product.id && p?.group !== product.group; });
    updateRider({ gear: selected ? gear : [...gear, { productId: product.id, size: product.sizes[0] || "" }] });
  }
  function go(next: number) {
    if (next > step) {
      if (!primaryBike) { setError("Choose your bike first."); return; }
      if (!rangeAvailable) { setError("Choose at least two consecutive days starting tomorrow or later when your bike is available."); return; }
      if (step >= 1 && draft.riders.some((r, i) => !r.bikeId || (i && (r.name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email) || !/^\+?[\d\s().-]{7,25}$/.test(r.phone))))) { setError("Choose a bike for every rider and enter each buddy’s name, email and phone."); return; }
      if (step >= 1) {
        const invalidBuddy = draft.riders.findIndex((rider, index) => index > 0 && !buddyDetailsValid(rider));
        if (invalidBuddy !== -1) { setActiveRider(invalidBuddy); setStep(1); setError(`${riderLabel(invalidBuddy)}: ${buddyDetailsError(draft.riders[invalidBuddy])}`); return; }
      }
      if (step >= 1) {
        const counts = new Map<string, number>();
        for (const r of draft.riders) for (const id of [r.bikeId, ...r.gear.map(g => g.productId)]) counts.set(id, (counts.get(id) || 0) + 1);
        if ([...counts].some(([id, quantity]) => (catalog?.products.find(p => p.id === id)?.remaining || 0) < quantity)) { setError("One of your group’s selections is no longer available for these dates. Please update your bikes or gear.", true); return; }
      }
      if (step === 3) {
        const missing = draft.riders.findIndex(r => r.wantsGear && !r.gear.length);
        if (missing !== -1) { setActiveRider(missing); setError(`Choose gear for ${riderLabel(missing)}, or select No to continue without it.`); return; }
      }
      if (next === 5 && needsCoach && !(draft.coachMode === "individual" ? draft.riders.some(rider => rider.coachId) : draft.coachId)) { setError("You require a coach in order to book. Please select one."); return; }
      if (next === 5 && draft.coachMode === "individual" && catalog?.needsCoach !== false && !draft.riders[0].coachId) { setError("You require a coach in order to book. Please select one for yourself."); return; }
    }
    setError(""); if (next === 5) { setEstimate(null); setQuoting(true); } setStep(next); if (next === 1 && activeRider === 0 && draft.riders.length > 1) setActiveRider(1); requestAnimationFrame(() => { introHeading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, left: 0, behavior: "instant" }); });
  }
  async function submit() {
    if (actionLock.current || !accepted || !estimate) return;
    actionLock.current = true; setBusy(true); setError("");
    const startedAt = performance.now();
    const finishLoading = () => new Promise<void>(resolve => window.setTimeout(resolve, Math.max(0, 2000 - (performance.now() - startedAt))));
    if (!clientKey.current) clientKey.current = crypto.randomUUID();
    try { const result = await rideRequest<{ request: RideRequest }>("", "POST", { ...draft, notes, clientKey: clientKey.current, privacyAccepted: accepted, expectedTotalAmount: estimate.totalAmount }); await finishLoading(); setSubmitted(result.request); }
    catch (err) { await finishLoading(); setError(err instanceof Error ? err.message : "Unable to submit your request.", err instanceof Error && /unavailable|availability|no longer available|not enough|estimate changed|prices changed/i.test(err.message)); }
    finally { setBusy(false); actionLock.current = false; }
  }

  const bikes = catalog?.products.filter(p => p.category === "bike") || [];
  const buddyBikes = bikes.filter(p => p.remaining > taken(p.id));
  const canAddBuddy = draft.riders.length < 4 && bikes.some(p => p.remaining > taken(p.id, false));
  const gearGroups = [...new Set(catalog?.products.filter(p => p.category !== "bike").map(p => p.group) || [])].sort((a, b) => ["helmet", "suit", "boots", "gloves"].indexOf(a) - ["helmet", "suit", "boots", "gloves"].indexOf(b));
  return <div className={`${shared.page} ${s.page}`}><PublicSiteHeader activePath="" compact /><main className={`${s.main} ${showVideo ? s.guestMain : ""}`}>
    {showVideo && <div className={s.backdrop} aria-hidden="true"><video ref={backdrop} muted loop playsInline preload="metadata" poster="/images/contact/b541a.png" onPlay={() => setVideoPlaying(true)} onPause={() => setVideoPlaying(false)}><source src="/videos/login-signup-videos.mov" /></video></div>}
    {showVideo && <button type="button" className={s.videoControl} aria-label={videoPlaying ? "Pause background video" : "Play background video"} onClick={() => { if (videoPlaying) backdrop.current?.pause(); else void backdrop.current?.play().catch(() => {}); }}>{videoPlaying ? <FiPause /> : <FiPlay />}<span>{videoPlaying ? "Pause video" : "Play video"}</span></button>}
    {!submitted && (user || loadingAuth) && <header className={s.intro}><h1 ref={introHeading} tabIndex={-1} style={{ outline: "none" }}>Book your ride</h1><p>Choose your bike, bring your buddies, and add a track, gear, and coaching. Minimum two consecutive days.</p></header>}
    {loadingAuth ? <p role="status">Loading your account…</p> : !user ? <section className={s.signInCard} aria-labelledby="booking-sign-in">
      <h1 id="booking-sign-in">Book your ride</h1>
      <p>Choose your bike, bring your buddies, and make it a ride to remember.</p>
      <p className={s.signInHint}>Sign in to choose your bike and ride dates.</p>
      <Link className={`${s.primary} ${s.signInButton}`} href={`/sign-in?next=${encodeURIComponent(`/booking${requestedBike ? `?bike=${requestedBike}` : ""}`)}`}>Sign in to book <FiArrowRight /></Link>
      <small>Minimum two consecutive days.</small>
    </section> : submitted ? <section className={s.success} aria-labelledby="ride-success-heading"><FiCheck size={42} aria-hidden="true" /><h2 ref={successHeading} id="ride-success-heading" tabIndex={-1}>Ride request received.</h2><p>Your request is awaiting admin approval. Your equipment will be reserved once approved. Payment will be arranged separately.</p><strong>Reference: {submitted.id.slice(0, 8).toUpperCase()}</strong><p>{dateLabel(submitted.startDate)} – {dateLabel(submitted.endDate)} · {submitted.estimate.track?.name || "No track selected"}</p><Link className={s.primary} href="/account?tab=bookings" replace>View my bookings <FiArrowRight /></Link></section> : <>
      {step > 0 && primaryBike && <div className={s.selectedRental}>{primaryBike.images[0] && <img src={primaryBike.images[0]} alt={primaryBike.name} />}<div><strong>{primaryBike.name}</strong><span>{rideMoney(Number(primaryBike.pricePerDay) * 100)} / day{draft.endDate ? ` | ${dateLabel(draft.startDate)} to ${dateLabel(draft.endDate)} | ${rangeDates.length} days` : ""}</span></div>{draft.riders.length > 1 && <span>{draft.riders.length} riders</span>}</div>}
      <nav ref={stepsNav} tabIndex={-1} className={s.steps} aria-label="Booking steps">{steps.map((label, i) => <button type="button" key={label} data-complete={i < step} aria-label={`${label}${i < step ? ", completed" : ""}`} disabled={busy || i > step} aria-current={i === step ? "step" : undefined} onClick={() => go(i)}><span>{i < step ? <FiCheck /> : `0${i + 1}`}</span>{label}</button>)}</nav>
      {error && <div ref={errorBox} tabIndex={-1} className={s.error} role="alert"><span>{error}</span>{errorRefresh && <button type="button" onClick={() => { setLoading(true); if (step === 5) setQuoting(true); setRevision(n => n + 1); }}>Refresh availability</button>}</div>}
      <div className={s.flowLayout}><div className={`${s.content} ${step === 0 ? s.bikeDateLayout : ""}`}><h2>{steps[step]}</h2>
      {step === 0 && <>
        <div className={s.bikeSelection}>
        {primaryBike && <section className={s.primaryBike}>
          {primaryBike.images[0] && <img src={primaryBike.images[0]} alt={primaryBike.name} />}
          <div><h3>{primaryBike.name}</h3><p>{rideMoney(Number(primaryBike.pricePerDay) * 100)} / day</p><button type="button" className={s.textButton} aria-expanded={changingBike} onClick={() => setChangingBike(value => !value)}>Change bike</button></div>
        </section>}
        {(changingBike || (!primaryBike && !loading)) && <div className={s.changeBikeField}><label>Choose your bike<select autoFocus value={draft.riders[0].bikeId} onChange={event => {
          setLoading(true); setDraft(previous => ({ ...previous, startDate: "", endDate: "", trackId: null, coachId: null, riders: previous.riders.map((r, i) => ({ ...r, bikeId: i === 0 ? event.target.value : "", wantsGear: false, gear: [] })) })); setChangingBike(false); setEstimate(null); setError(""); setRevision(value => value + 1);
        }}><option value="" disabled>Select a bike</option>{catalog?.bikes.map(bike => <option key={bike.id} value={bike.id}>{bike.name} - {rideMoney(Number(bike.pricePerDay) * 100)} / day</option>)}</select></label></div>}
        {loading && <p role="status">Checking bike availability...</p>}
        </div>
        {primaryBike && catalog && <div className={s.dateSelection}><BookingDatePicker availableDates={primaryBike.availableDates} today={catalog.today} lastDate={catalog.lastDate} start={draft.startDate} end={draft.endDate} onChange={changeDates} /></div>}
        {!loading && !catalog?.bikes.length && <p className={s.empty}>No bikes are currently available.</p>}
      </>}
      {step === 2 && <><p className={s.muted}>Choose a track available for all your selected dates, or skip this step.</p><div className={s.trackGrid}>{catalog?.tracks.map(t => <button type="button" key={t.id} className={s.trackCard} aria-pressed={draft.trackId === t.id} onClick={() => { setDraft(previous => ({ ...previous, trackId: t.id })); setError(""); }}>{t.images[0] && <img src={t.images[0]} alt={t.name} />}<span><small>{t.city}, California</small><strong>{t.name}</strong></span>{draft.trackId === t.id && <FiCheck />}</button>)}</div>{!catalog?.tracks.length && <p className={s.muted}>No tracks are currently available for all your selected dates. You can skip track selection.</p>}<button type="button" className={s.textButton} onClick={() => { setDraft(previous => ({ ...previous, trackId: null })); go(3); }}>Skip track selection <FiArrowRight /></button><p className={s.muted}>If you don&apos;t choose a track, MXSoCal will select the best available track for your selected dates.</p></>}
      {(step === 1 && draft.riders.length > 1) && <div className={s.riderTabs} aria-label="Choose rider">{draft.riders.map((r, i) => step === 1 && i === 0 ? null : <button key={i} type="button" aria-pressed={activeRider === i} onClick={() => setActiveRider(i)}>{riderLabel(i)}{r.bikeId && <FiCheck />}</button>)}</div>}
      {step === 1 && <>{activeRider > 0 && <section className={s.panel}><div className={s.panelHeading}><h3>Meet your buddy</h3><button type="button" className={s.textButton} onClick={() => {
        const remaining = draft.riders.filter((_, index) => index !== activeRider);
        setDraft(previous => {
          const riders = previous.riders.filter((_, index) => index !== activeRider);
          return { ...previous, riders, ...(riders.length === 1 ? { coachMode: "group" as const, coachId: previous.coachMode === "individual" ? riders[0].coachId || null : previous.coachId } : {}) };
        });
        setActiveRider(remaining.length > 1 ? Math.min(activeRider, remaining.length - 1) : 0);
        setCoachRider(0); setEstimate(null); setError("");
      }}><FiTrash2 /> Remove buddy</button></div><div className={s.contactFields}>{(["name", "email", "phone"] as const).map(key => <label key={key}>{key === "name" ? "Full name" : key === "email" ? "Email address" : "Phone number"}<input type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} maxLength={key === "email" ? 254 : key === "phone" ? 25 : 100} value={rider[key]} onChange={e => updateRider({ [key]: e.target.value })} required /></label>)}{([{ key: "age", label: "Age (years)", min: 1, max: 120, step: 1 }, { key: "heightCm", label: "Height (cm)", min: 30, max: 300, step: 0.1 }, { key: "weightKg", label: "Weight (kg)", min: 1, max: 500, step: 0.1 }] as const).map(field => <label key={field.key}>{field.label}<input type="number" inputMode={field.key === "age" ? "numeric" : "decimal"} min={field.min} max={field.max} step={field.step} value={rider[field.key] ?? ""} onChange={event => updateRider({ [field.key]: event.target.value })} required /></label>)}</div></section>}<p className={s.muted}>{activeRider === 0 ? "Add a buddy, or continue on your own." : <>Choose a bike for {riderLabel(activeRider)}. Only bikes available for all your selected dates are shown.</>}</p>{activeRider > 0 && <div className={s.productGrid}>{buddyBikes.map(p => <button type="button" key={p.id} className={s.productCard} aria-pressed={rider.bikeId === p.id} onClick={() => updateRider({ bikeId: p.id })}>{p.images[0] && <img src={p.images[0]} alt={p.name} />}<strong>{p.name}</strong><span>{rideMoney(Number(p.pricePerDay) * 100)} / day</span>{rider.bikeId === p.id && <small><FiCheck /> Selected for {riderLabel(activeRider)}</small>}</button>)}</div>}{activeRider > 0 && !loading && !buddyBikes.length && <p className={s.empty}>No additional bikes are available for these dates. Remove this buddy or choose different dates.</p>}<section className={s.buddyInvite}><div><h3>Got a buddy?</h3><p>Add up to 3 buddies, with their contact details, age, height, weight, and a bike for the same ride dates.</p></div><button type="button" className={s.secondary} disabled={loading || !rangeAvailable || !canAddBuddy || draft.riders.length >= 4} onClick={() => {
        if (draft.riders.length >= 4) return;
        setDraft(previous => previous.riders.length >= 4 ? previous : ({ ...previous, riders: [...previous.riders, emptyRider()] })); setActiveRider(draft.riders.length); setEstimate(null); setError("");
        requestAnimationFrame(() => { stepsNav.current?.focus({ preventScroll: true }); stepsNav.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }); });
      }}><FiPlus /> Add a buddy</button></section>{draft.riders.length >= 4 ? <p className={s.muted}>Maximum 3 buddies per booking ({draft.riders.length - 1}/3 added).</p> : !loading && !canAddBuddy && <p className={s.muted}>All available bikes are already selected for your group.</p>}</>}
      {step === 3 && <>
        <div className={s.gearPreferences}>{draft.riders.map((r, i) => <fieldset key={i} className={s.gearPreference} data-active={activeRider === i && !!r.wantsGear}>
          <legend>{i === 0 ? "Would you like extra gear?" : `Extra gear for ${riderLabel(i)}?`}</legend>
          <label><input type="radio" name={`gear-${i}`} checked={!!r.wantsGear} disabled={catalog?.gearDailyAmount == null} onClick={() => setActiveRider(i)} onChange={() => setGearPreference(i, true)} />Yes - {catalog?.gearDailyAmount != null ? rideMoney(catalog.gearDailyAmount) : "Unavailable"} / day</label>
          <label><input type="radio" name={`gear-${i}`} checked={!r.wantsGear} onChange={() => setGearPreference(i, false)} />No, bringing {i === 0 ? "my" : "their"} own</label>
          {r.wantsGear && <button type="button" className={s.textButton} onClick={() => setActiveRider(i)}>{r.gear.length ? `Edit gear (${r.gear.length} selected)` : "Choose gear"}</button>}
        </fieldset>)}</div>
        {catalog?.gearDailyAmount == null && <p className={s.muted}>Gear rental is temporarily unavailable.</p>}
        {rider.wantsGear && <section aria-label={`Gear for ${riderLabel(activeRider)}`}><h3>Gear for {riderLabel(activeRider)}</h3><p className={s.muted}>Choose up to one item per category. The daily gear price stays the same.</p>{gearGroups.map(group => <section key={group} className={s.gearGroup}><h3>{group === "boots" ? "Boots & shoes" : group.charAt(0).toUpperCase() + group.slice(1)}</h3><div className={s.productGrid}>{catalog?.products.filter(p => p.category !== "bike" && p.group === group && (p.remaining > taken(p.id) || rider.gear.some(g => g.productId === p.id))).map(p => { const selected = rider.gear.find(g => g.productId === p.id); return <article className={s.gearCard} key={p.id} data-selected={!!selected}><button type="button" className={s.gearChoice} aria-pressed={!!selected} disabled={catalog?.gearDailyAmount == null && !selected} onClick={() => chooseGear(p)}>{p.images[0] && <img src={p.images[0]} alt={p.name} />}<strong>{p.name}</strong><span>Included in gear rental</span><small>{selected ? "Selected · click to remove" : "Add to rider"}</small></button>{selected && p.sizes.length > 0 && <fieldset className={s.sizeField}><legend>Size</legend><div className={s.sizeButtons}>{["S", "M", "L", "XL"].map(size => <button key={size} type="button" aria-pressed={selected.size === size} aria-label={`${size}${!p.sizes.includes(size) ? ", unavailable" : ""}`} disabled={!p.sizes.includes(size)} onClick={() => updateRider({ gear: rider.gear.map(g => g.productId === p.id ? { ...g, size } : g) })}>{size}</button>)}</div></fieldset>}</article>; })}</div></section>)}{!gearGroups.length && <p className={s.empty}>No gear is available for these dates. Select No to continue with your own gear.</p>}</section>}
      </>}
      {step === 4 && <>
        <p className={s.muted}>{needsCoach ? "You require a coach in order to book. Please select one." : "Add coaching for your ride, or continue without a coach."}{draft.riders.length > 1 && " Bookings with buddies require at least one coach."}</p>
        {draft.riders.length > 1 && <div className={s.riderTabs} role="group" aria-label="Coaching arrangement">{(["group", "individual"] as const).map(mode => <button key={mode} type="button" aria-pressed={(draft.coachMode || "group") === mode} onClick={() => { setDraft(previous => ({ ...previous, coachMode: mode, coachId: null, riders: previous.riders.map(rider => ({ ...rider, coachId: null })) })); setCoachRider(0); setEstimate(null); setError(""); }}>{mode === "group" ? "One coach for the whole group" : "Choose coaches by rider"}</button>)}</div>}
        {draft.riders.length > 1 && draft.coachMode === "individual" && <><p className={s.muted}>Select a rider, then choose their coach. Each rider must have a different coach. To share a coach, choose one coach for the whole group.</p><div className={s.riderTabs} aria-label="Choose rider for coaching">{draft.riders.map((rider, index) => <button type="button" key={index} aria-pressed={Math.min(coachRider, draft.riders.length - 1) === index} onClick={() => setCoachRider(index)}>{riderLabel(index)}{rider.coachId && <FiCheck />}</button>)}</div></>}
        <div className={s.productGrid}>{catalog?.coaches.map(coach => {
          const target = Math.min(coachRider, draft.riders.length - 1);
          const selected = (draft.coachMode === "individual" ? draft.riders[target].coachId : draft.coachId) === coach.id;
          const assignedTo = draft.coachMode === "individual" ? draft.riders.findIndex((rider, index) => index !== target && rider.coachId === coach.id) : -1;
          return <button type="button" key={coach.id} className={`${s.productCard} ${s.coachCard}`} aria-pressed={selected} disabled={assignedTo !== -1} onClick={() => { if (assignedTo !== -1) return; setDraft(previous => previous.coachMode === "individual" ? ({ ...previous, riders: previous.riders.map((rider, index) => index === target ? { ...rider, coachId: selected ? null : coach.id } : rider) }) : ({ ...previous, coachId: selected ? null : coach.id })); setEstimate(null); setError(""); }}>{coach.image && <img src={coach.image} alt={coach.name} />}<strong>{coach.name}</strong><small>{coach.specialty}</small><span>{rideMoney(Number(coach.dailyRate) * 100)} / day</span>{assignedTo !== -1 && <small>Assigned to {riderLabel(assignedTo)}</small>}{selected && <small><FiCheck /> Selected{draft.coachMode === "individual" ? ` for ${riderLabel(target)}` : " for the whole group"}</small>}</button>;
        })}</div>
        {!catalog?.coaches.length && <p className={s.empty}>No coaches are available for the whole ride.{needsCoach ? " Please try different dates or contact us." : " You can continue without a coach."}</p>}
        {!needsCoach && <button className={s.textButton} type="button" onClick={() => { setDraft(previous => ({ ...previous, coachId: null, riders: previous.riders.map(rider => ({ ...rider, coachId: null })) })); go(5); }}>Continue without a coach <FiArrowRight /></button>}
      </>}
      {step === 5 && <>{quoting ? <p role="status">Checking your group’s availability and daily estimate…</p> : estimate && <><section className={s.panel}><h3>Ride details</h3>{estimate.track && <p>{estimate.track.name}</p>}<p>{dateLabel(draft.startDate)} – {dateLabel(draft.endDate)} · {estimate.dates.length} days · {draft.riders.length} riders</p>{draft.riders.map((r, i) => <div key={i} className={s.reviewRider}><h3>{i === 0 ? user.name : r.name}{i > 0 && <small className={s.buddyLabel}> (Buddy)</small>}</h3>{i > 0 && <p>{r.email} · {r.phone}</p>}<ReviewRiderItems items={estimate.items.filter(item => item.riderIndex === i)} /></div>)}{estimate.items.filter(item => item.coachId).map(item => <ReviewItem key={item.coachId} item={item} />)}<div className={s.total}><span>Estimated total</span><strong>{rideMoney(estimate.totalAmount)}</strong></div><p className={s.muted}>Subject to admin approval. No payment is taken now. Equipment is reserved only after approval.</p></section><label className={s.notes}>Anything we should know?<textarea maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} /></label><label className={s.consent}><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} /><span>I agree to the <Link href="/privacy-policy" target="_blank">privacy policy</Link> and confirm I have permission to provide my buddies’ contact details for this request.</span></label></>}</>}
      <div className={s.actions}>{step > 0 && <button type="button" className={s.secondary} disabled={busy} onClick={() => go(step - 1)}><FiArrowLeft /> Back</button>}{step < 5 ? <button type="button" className={s.primary} disabled={loading || ((step === 0 || step === 1) && !rangeAvailable)} onClick={() => go(step + 1)}>{step === 1 && draft.riders.length === 1 ? "Continue without a buddy" : step === 3 && !draft.riders.some(r => r.wantsGear) ? "Continue without gear" : "Continue"} <FiArrowRight /></button> : <button type="button" className={s.primary} disabled={busy || quoting || !estimate || !accepted} aria-busy={busy} onClick={submit}>{busy ? "Sending request…" : "Request Booking"} <FiArrowRight /></button>}</div>
      </div></div>
    </>}
    </main><PublicSiteFooter /></div>;
}

function ReviewRiderItems({ items }: { items: RideEstimate["items"] }) {
  const bundle = items.find(item => item.gearPackage);
  const included = items.filter(item => item.included);
  return <>
    {items.filter(item => !item.gearPackage && !item.included).map((item, index) => <ReviewItem key={item.productId || index} item={item} />)}
    {bundle ? <section className={s.gearBundle} aria-label="Gear rental bundle">
      <ReviewItem item={bundle} />
      <div className={s.bundleContents} aria-label="Gear included in the bundle">{included.map((item, index) => <ReviewItem key={item.productId || index} item={item} />)}</div>
    </section> : included.map((item, index) => <ReviewItem key={item.productId || index} item={item} />)}
  </>;
}

function ReviewItem({ item }: { item: RideEstimate["items"][number] }) {
  const [failed, setFailed] = useState(false);
  return <div className={s.lineItem}>
    {item.image && !failed ? <img className={s.reviewPhoto} data-coach={!!item.coachId} src={item.image} alt={item.name} loading="lazy" onError={() => setFailed(true)} /> : <span className={`${s.reviewPhoto} ${s.reviewPlaceholder}`} aria-hidden="true">{item.gearPackage ? <FiPackage /> : <FiImage />}</span>}
    <span className={s.reviewText}>{item.coachId ? "Coach - " : ""}{item.name}{item.size ? ` / ${item.size}` : ""}{item.assignmentLabel && <small>{item.assignmentLabel}</small>}{!item.included && <small>{rideMoney(item.dailyAmount)} x {item.days} days</small>}</span>
    <strong>{item.included ? "Included" : rideMoney(item.amount)}</strong>
  </div>;
}
