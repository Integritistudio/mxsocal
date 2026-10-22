/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiCheck, FiImage, FiPackage, FiPlus, FiTrash2 } from "react-icons/fi";
import { useUser } from "@/context/UserContext";
import { rideRequest, rideMoney, type RideCatalog, type RideDraft, type RideEstimate, type Rider, type RideProduct, type RideRequest } from "@/services/ride-requests";
import BookingDatePicker from "./BookingDatePicker";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";
import shared from "./contact-design.module.css";
import s from "./ride-booking.module.css";
const steps = ["Bike & dates", "Buddies", "Track", "Gear", "Coach", "Review"];
const emptyRider = (): Rider => ({ name: "", email: "", phone: "", bikeId: "", wantsGear: false, gear: [] });
const initialDraft = (): RideDraft => ({ trackId: "", startDate: "", endDate: "", riders: [emptyRider()], coachId: null, notes: "" });
const dateLabel = (date: string) => date ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)) : "Choose dates";
export default function RideBookingFlow() {
  const { user, loadingAuth } = useUser(); const params = useSearchParams(); const requestedBike = params.get("bike") || "";
  const [draft, setDraft] = useState<RideDraft>(initialDraft); const [step, setStep] = useState(0); const [activeRider, setActiveRider] = useState(0);
  const [catalog, setCatalog] = useState<RideCatalog | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [revision, setRevision] = useState(0);
  const [notes, setNotes] = useState("");
  const [changingBike, setChangingBike] = useState(false);
  const [estimate, setEstimate] = useState<RideEstimate | null>(null); const [quoting, setQuoting] = useState(false); const [accepted, setAccepted] = useState(false); const [busy, setBusy] = useState(false); const [submitted, setSubmitted] = useState<RideRequest | null>(null);
  const initialBikeChecked = useRef(false); const clientKey = useRef(""); const heading = useRef<HTMLHeadingElement>(null); const actionLock = useRef(false);
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
    }).catch(err => { if (!controller.signal.aborted) { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, [draft.startDate, draft.endDate, validRange, requestedBike, user?.id, revision]);
  useEffect(() => {
    if (step !== 5 || !user) return;
    const controller = new AbortController();
    void rideRequest<{ estimate: RideEstimate }>("quote", "POST", draft, controller.signal).then(data => { setEstimate(data.estimate); setQuoting(false); }).catch(err => { if (!controller.signal.aborted) { setError(err.message); setQuoting(false); } });
    return () => controller.abort();
  }, [step, draft, user, revision]);
  const rider = draft.riders[activeRider] || draft.riders[0];
  const riderLabel = (i: number) => i === 0 ? "You" : draft.riders[i].name || `Buddy ${i}`;
  const needsCoach = catalog?.needsCoach !== false;
  const rangeDates = validRange ? Array.from({ length: Math.min(62, Math.round((Date.parse(draft.endDate) - Date.parse(draft.startDate)) / 86400000) + 1) }, (_, i) => new Date(Date.parse(`${draft.startDate}T12:00:00Z`) + i * 86400000).toISOString().slice(0, 10)) : [];
  const primaryBike = catalog?.bikes.find(b => b.id === draft.riders[0].bikeId);
  const rangeAvailable = !!primaryBike && rangeDates.length >= 2 && rangeDates.every(date => primaryBike.availableDates.includes(date));
  function updateRider(update: Partial<Rider>) { setDraft(previous => ({ ...previous, riders: previous.riders.map((r, i) => i === activeRider ? { ...r, ...update } : r) })); setEstimate(null); }
  function setGearPreference(index: number, enabled: boolean) {
    setDraft(previous => ({ ...previous, riders: previous.riders.map((r, i) => i === index ? { ...r, wantsGear: enabled, gear: enabled ? r.gear : [] } : r) }));
    setActiveRider(index); setEstimate(null); setError("");
  }
  function changeDates(startDate: string, endDate: string) {
    setLoading(true); setEstimate(null); setDraft(previous => ({ ...previous, startDate, endDate, trackId: null, coachId: null, riders: previous.riders.map(r => ({ ...r, wantsGear: false, gear: [] })) }));
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
      if (!rangeAvailable) { setError("Choose at least two consecutive days when your bike is available."); return; }
      if (step >= 1 && draft.riders.some((r, i) => !r.bikeId || (i && (r.name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email) || !/^\+?[\d\s().-]{7,25}$/.test(r.phone))))) { setError("Choose a bike for every rider and enter each buddy’s name, email and phone."); return; }
      if (step >= 1) {
        const counts = new Map<string, number>();
        for (const r of draft.riders) for (const id of [r.bikeId, ...r.gear.map(g => g.productId)]) counts.set(id, (counts.get(id) || 0) + 1);
        if ([...counts].some(([id, quantity]) => (catalog?.products.find(p => p.id === id)?.remaining || 0) < quantity)) { setError("One of your group’s selections is no longer available for these dates. Please update your bikes or gear."); return; }
      }
      if (step === 3) {
        const missing = draft.riders.findIndex(r => r.wantsGear && !r.gear.length);
        if (missing !== -1) { setActiveRider(missing); setError(`Choose gear for ${riderLabel(missing)}, or select No to continue without it.`); return; }
      }
      if (next === 5 && needsCoach && !draft.coachId) { setError("Your account requires a group coach. Choose an available coach to continue."); return; }
    }
    setError(""); if (next === 5) { setEstimate(null); setQuoting(true); } setStep(next); if (next === 1 && activeRider === 0 && draft.riders.length > 1) setActiveRider(1); requestAnimationFrame(() => heading.current?.focus());
  }
  async function submit() {
    if (actionLock.current || !accepted || !estimate) return;
    actionLock.current = true; setBusy(true); setError("");
    if (!clientKey.current) clientKey.current = crypto.randomUUID();
    try { const result = await rideRequest<{ request: RideRequest }>("", "POST", { ...draft, notes, clientKey: clientKey.current, privacyAccepted: accepted, expectedTotalAmount: estimate.totalAmount }); setSubmitted(result.request); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to submit your request."); }
    finally { setBusy(false); actionLock.current = false; }
  }

  const bikes = catalog?.products.filter(p => p.category === "bike") || [];
  const buddyBikes = bikes.filter(p => p.remaining > taken(p.id));
  const canAddBuddy = bikes.some(p => p.remaining > taken(p.id, false));
  const gearGroups = [...new Set(catalog?.products.filter(p => p.category !== "bike").map(p => p.group) || [])].sort((a, b) => ["helmet", "suit", "boots", "gloves"].indexOf(a) - ["helmet", "suit", "boots", "gloves"].indexOf(b));
  return <div className={`${shared.page} ${s.page}`}><PublicSiteHeader activePath="" compact /><main className={s.main}>
    <header className={s.intro}><h1>Book your ride</h1><p>Choose your bike, bring your buddies, and add a track, gear, and coaching. Minimum two consecutive days.</p></header>
    {loadingAuth ? <p role="status">Loading your account…</p> : !user ? <section className={s.panel}><h2>Sign in to book</h2><p>Sign in to choose your bike and ride dates.</p><Link className={s.primary} href={`/sign-in?next=${encodeURIComponent(`/booking${requestedBike ? `?bike=${requestedBike}` : ""}`)}`}>Sign in to book <FiArrowRight /></Link></section> : submitted ? <section className={s.success}><FiCheck size={42} /><h2>Ride request received.</h2><p>Your request is awaiting admin approval. Your equipment will be reserved once approved. Payment will be arranged separately.</p><strong>Reference: {submitted.id.slice(0, 8).toUpperCase()}</strong><p>{dateLabel(submitted.startDate)} – {dateLabel(submitted.endDate)} · {submitted.estimate.track?.name || "No track selected"}</p><Link className={s.primary} href="/account/requests">View my requests <FiArrowRight /></Link></section> : <>
      {step > 0 && primaryBike && <div className={s.selectedRental}>{primaryBike.images[0] && <img src={primaryBike.images[0]} alt={primaryBike.name} />}<div><strong>{primaryBike.name}</strong><span>{rideMoney(Number(primaryBike.pricePerDay) * 100)} / day{draft.endDate ? ` | ${dateLabel(draft.startDate)} to ${dateLabel(draft.endDate)} | ${rangeDates.length} days` : ""}</span></div>{draft.riders.length > 1 && <span>{draft.riders.length} riders</span>}</div>}
      <nav className={s.steps} aria-label="Booking steps">{steps.map((label, i) => <button type="button" key={label} data-complete={i < step} aria-label={`${label}${i < step ? ", completed" : ""}`} disabled={busy || i > step} aria-current={i === step ? "step" : undefined} onClick={() => go(i)}><span>{i < step ? <FiCheck /> : `0${i + 1}`}</span>{label}</button>)}</nav>
      {error && <div className={s.error} role="alert">{error}<button type="button" onClick={() => { setLoading(true); if (step === 5) setQuoting(true); setRevision(n => n + 1); }}>Refresh availability</button></div>}
      <div className={s.flowLayout}><div className={s.content}><h2 ref={heading} tabIndex={-1}>{steps[step]}</h2>
      {step === 0 && <>
        {primaryBike && <section className={s.primaryBike}>
          {primaryBike.images[0] && <img src={primaryBike.images[0]} alt={primaryBike.name} />}
          <div><h3>{primaryBike.name}</h3><p>{rideMoney(Number(primaryBike.pricePerDay) * 100)} / day</p><button type="button" className={s.textButton} aria-expanded={changingBike} onClick={() => setChangingBike(value => !value)}>Change bike</button></div>
        </section>}
        {(changingBike || (!primaryBike && !loading)) && <div className={s.changeBikeField}><label>Choose your bike<select autoFocus value={draft.riders[0].bikeId} onChange={event => {
          setLoading(true); setDraft(previous => ({ ...previous, startDate: "", endDate: "", trackId: null, coachId: null, riders: previous.riders.map((r, i) => ({ ...r, bikeId: i === 0 ? event.target.value : "", wantsGear: false, gear: [] })) })); setChangingBike(false); setEstimate(null); setError(""); setRevision(value => value + 1);
        }}><option value="" disabled>Select a bike</option>{catalog?.bikes.map(bike => <option key={bike.id} value={bike.id}>{bike.name} - {rideMoney(Number(bike.pricePerDay) * 100)} / day</option>)}</select></label></div>}
        {loading && <p role="status">Checking bike availability...</p>}
        {primaryBike && catalog && <BookingDatePicker availableDates={primaryBike.availableDates} today={catalog.today} lastDate={catalog.lastDate} start={draft.startDate} end={draft.endDate} onChange={changeDates} />}
        {!loading && !catalog?.bikes.length && <p className={s.empty}>No bikes are currently available.</p>}
      </>}
      {step === 2 && <><p className={s.muted}>Choose a track, or skip this step.</p><div className={s.trackGrid}>{catalog?.tracks.map(t => <button type="button" key={t.id} className={s.trackCard} aria-pressed={draft.trackId === t.id} onClick={() => { setDraft(previous => ({ ...previous, trackId: t.id })); setError(""); }}>{t.images[0] && <img src={t.images[0]} alt={t.name} />}<span><small>{t.city}, California</small><strong>{t.name}</strong></span>{draft.trackId === t.id && <FiCheck />}</button>)}</div>{!catalog?.tracks.length && <p className={s.muted}>No tracks to show. You can continue without one.</p>}<button type="button" className={s.textButton} onClick={() => { setDraft(previous => ({ ...previous, trackId: null })); go(3); }}>Skip track selection <FiArrowRight /></button></>}
      {(step === 1 && draft.riders.length > 1) && <div className={s.riderTabs} aria-label="Choose rider">{draft.riders.map((r, i) => step === 1 && i === 0 ? null : <button key={i} type="button" aria-pressed={activeRider === i} onClick={() => setActiveRider(i)}>{riderLabel(i)}{r.bikeId && <FiCheck />}</button>)}</div>}
      {step === 1 && <>{activeRider > 0 && <section className={s.panel}><div className={s.panelHeading}><h3>Meet your buddy</h3><button type="button" className={s.textButton} onClick={() => { setDraft(previous => ({ ...previous, riders: previous.riders.filter((_, i) => i !== activeRider) })); setActiveRider(draft.riders.length > 2 ? 1 : 0); }}><FiTrash2 /> Remove buddy</button></div><div className={s.contactFields}>{(["name", "email", "phone"] as const).map(key => <label key={key}>{key === "name" ? "Full name" : key === "email" ? "Email address" : "Phone number"}<input type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} maxLength={key === "email" ? 254 : key === "phone" ? 25 : 100} value={rider[key]} onChange={e => updateRider({ [key]: e.target.value })} required /></label>)}</div></section>}<p className={s.muted}>{activeRider === 0 ? "Add a buddy, or continue on your own." : <>Choose a bike for {riderLabel(activeRider)}. Only bikes available for all your selected dates are shown.</>}</p>{activeRider > 0 && <div className={s.productGrid}>{buddyBikes.map(p => <button type="button" key={p.id} className={s.productCard} aria-pressed={rider.bikeId === p.id} onClick={() => updateRider({ bikeId: p.id })}>{p.images[0] && <img src={p.images[0]} alt={p.name} />}<strong>{p.name}</strong><span>{rideMoney(Number(p.pricePerDay) * 100)} / day</span>{rider.bikeId === p.id && <small><FiCheck /> Selected for {riderLabel(activeRider)}</small>}</button>)}</div>}{activeRider > 0 && !loading && !buddyBikes.length && <p className={s.empty}>No additional bikes are available for these dates. Remove this buddy or choose different dates.</p>}<section className={s.buddyInvite}><div><h3>Got a buddy?</h3><p>Add their contact details and a bike for the same ride dates.</p></div><button type="button" className={s.secondary} disabled={loading || !rangeAvailable || !canAddBuddy || draft.riders.length >= 21} onClick={() => { setDraft(previous => ({ ...previous, riders: [...previous.riders, emptyRider()] })); setActiveRider(draft.riders.length); }}><FiPlus /> Add a buddy</button></section>{!loading && !canAddBuddy && <p className={s.muted}>All available bikes are already selected for your group.</p>}</>}
      {step === 3 && <>
        <div className={s.gearPreferences}>{draft.riders.map((r, i) => <fieldset key={i} className={s.gearPreference} data-active={activeRider === i && !!r.wantsGear}>
          <legend>{i === 0 ? "Would you like extra gear?" : `Extra gear for ${riderLabel(i)}?`}</legend>
          <label><input type="radio" name={`gear-${i}`} checked={!!r.wantsGear} disabled={catalog?.gearDailyAmount == null} onClick={() => setActiveRider(i)} onChange={() => setGearPreference(i, true)} />Yes - {catalog?.gearDailyAmount != null ? rideMoney(catalog.gearDailyAmount) : "Unavailable"} / day</label>
          <label><input type="radio" name={`gear-${i}`} checked={!r.wantsGear} onChange={() => setGearPreference(i, false)} />No, bringing {i === 0 ? "my" : "their"} own</label>
          {r.wantsGear && <button type="button" className={s.textButton} onClick={() => setActiveRider(i)}>{r.gear.length ? `Edit gear (${r.gear.length} selected)` : "Choose gear"}</button>}
        </fieldset>)}</div>
        {catalog?.gearDailyAmount == null && <p className={s.muted}>Gear rental is temporarily unavailable.</p>}
        {rider.wantsGear && <section aria-label={`Gear for ${riderLabel(activeRider)}`}><h3>Gear for {riderLabel(activeRider)}</h3><p className={s.muted}>Choose up to one item per category. The daily gear price stays the same.</p>{gearGroups.map(group => <section key={group} className={s.gearGroup}><h3>{group === "boots" ? "Boots & shoes" : group.charAt(0).toUpperCase() + group.slice(1)}</h3><div className={s.productGrid}>{catalog?.products.filter(p => p.category !== "bike" && p.group === group && (p.remaining > taken(p.id) || rider.gear.some(g => g.productId === p.id))).map(p => { const selected = rider.gear.find(g => g.productId === p.id); return <article className={s.gearCard} key={p.id} data-selected={!!selected}><button type="button" className={s.gearChoice} aria-pressed={!!selected} disabled={catalog?.gearDailyAmount == null && !selected} onClick={() => chooseGear(p)}>{p.images[0] && <img src={p.images[0]} alt={p.name} />}<strong>{p.name}</strong><span>Included in gear rental</span><small>{selected ? "Selected · click to remove" : "Add to rider"}</small></button>{selected && p.sizes.length > 0 && <label className={s.sizeField}>Size<select value={selected.size} onChange={e => updateRider({ gear: rider.gear.map(g => g.productId === p.id ? { ...g, size: e.target.value } : g) })}>{p.sizes.map(size => <option key={size}>{size}</option>)}</select></label>}</article>; })}</div></section>)}{!gearGroups.length && <p className={s.empty}>No gear is available for these dates. Select No to continue with your own gear.</p>}</section>}
      </>}
      {step === 4 && <><p className={s.muted}>{needsCoach ? "Your account requires coaching. Choose one available coach for your entire group." : "Want some guidance? Add a coach for the whole group, or continue without one."}</p><div className={s.productGrid}>{catalog?.coaches.map(coach => <button type="button" key={coach.id} className={`${s.productCard} ${s.coachCard}`} aria-pressed={draft.coachId === coach.id} onClick={() => setDraft(previous => ({ ...previous, coachId: coach.id }))}>{coach.image && <img src={coach.image} alt={coach.name} />}<strong>{coach.name}</strong><small>{coach.specialty}</small><span>{rideMoney(Number(coach.dailyRate) * 100)} / day · whole group</span>{draft.coachId === coach.id && <small><FiCheck /> Selected</small>}</button>)}</div>{!catalog?.coaches.length && <p className={s.empty}>No coaches are available for the whole ride.{needsCoach ? " Please try different dates or contact us." : " You can continue without a coach."}</p>}{!needsCoach && <button className={s.textButton} type="button" onClick={() => { setDraft(previous => ({ ...previous, coachId: null })); go(5); }}>Continue without a coach <FiArrowRight /></button>}</>}
      {step === 5 && <>{quoting ? <p role="status">Checking your group’s availability and daily estimate…</p> : estimate && <><section className={s.panel}><h3>Ride details</h3>{estimate.track && <p>{estimate.track.name}</p>}<p>{dateLabel(draft.startDate)} – {dateLabel(draft.endDate)} · {estimate.dates.length} days · {draft.riders.length} riders</p>{draft.riders.map((r, i) => <div key={i} className={s.reviewRider}><h3>{i === 0 ? user.name : r.name}{i > 0 && <small className={s.buddyLabel}> (Buddy)</small>}</h3>{i > 0 && <p>{r.email} · {r.phone}</p>}<ReviewRiderItems items={estimate.items.filter(item => item.riderIndex === i)} /></div>)}{estimate.items.filter(item => item.coachId).map(item => <ReviewItem key={item.coachId} item={item} />)}<div className={s.total}><span>Estimated total</span><strong>{rideMoney(estimate.totalAmount)}</strong></div><p className={s.muted}>Subject to admin approval. No payment is taken now. Equipment is reserved only after approval.</p></section><label className={s.notes}>Anything we should know?<textarea maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} /></label><label className={s.consent}><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} /><span>I agree to the <Link href="/privacy-policy" target="_blank">privacy policy</Link> and confirm I have permission to provide my buddies’ contact details for this request.</span></label></>}</>}
      <div className={s.actions}>{step > 0 && <button type="button" className={s.secondary} disabled={busy} onClick={() => go(step - 1)}><FiArrowLeft /> Back</button>}{step < 5 ? <button type="button" className={s.primary} disabled={loading || ((step === 0 || step === 1) && !rangeAvailable)} onClick={() => go(step + 1)}>{step === 1 && draft.riders.length === 1 ? "Continue without a buddy" : step === 3 && !draft.riders.some(r => r.wantsGear) ? "Continue without gear" : "Continue"} <FiArrowRight /></button> : <button type="button" className={s.primary} disabled={busy || quoting || !estimate || !accepted} onClick={submit}>{busy ? "Sending request…" : "Request Booking"} <FiArrowRight /></button>}</div>
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
    <span className={s.reviewText}>{item.coachId ? "Group coach - " : ""}{item.name}{item.size ? ` / ${item.size}` : ""}{!item.included && <small>{rideMoney(item.dailyAmount)} x {item.days} days</small>}</span>
    <strong>{item.included ? "Included" : rideMoney(item.amount)}</strong>
  </div>;
}
