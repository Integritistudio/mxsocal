/* eslint-disable @next/next/no-img-element */
"use client";
import BookingSkeleton from "./BookingSkeleton";
import { bookingDateLabel, bookingSessionLabel } from "./booking-format";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";
import { useUser } from "@/context/UserContext";
import { bookingRequest, type BookingDraft, type BookingQuote, type RentalCoach, type RentalProduct, type Slot } from "@/services/booking";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";
import shared from "./contact-design.module.css";
import s from "./booking.module.css";

const titles = ["Bike Availability", "Select Helmet", "Select Suit", "Select Shoes", "Select Coach", "Final Selection"];
const groups = ["helmet", "suit", "boots"];
const storageKey = "mxsocal-booking-v1";
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (value: string, count: number) => dateKey(new Date(Date.parse(`${value}T12:00:00Z`) + count * 86400000));
const monday = (value: string) => addDays(value, -((new Date(`${value}T12:00:00Z`).getUTCDay() + 6) % 7));
const money = (amount: number, currency = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
const todayPacific = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
type Schedule = { date: string; slots: Slot[] };
const empty: BookingDraft = { productId: "", quantity: 1, bookingDate: "", slots: [], accessories: [] };

export default function BookingFlow() {
  const router = useRouter(); const params = useSearchParams(); const requestedBike = params.get("bike") || ""; const reviewRequested = params.get("review") === "1";
  const { user, loadingAuth } = useUser();
  const [products, setProducts] = useState<RentalProduct[]>([]); const [coaches, setCoaches] = useState<RentalCoach[]>([]);
  const [draft, setDraft] = useState<BookingDraft>(empty); const [step, setStep] = useState(0); const [ready, setReady] = useState(false);
  const [viewDate, setViewDate] = useState(""); const [week, setWeek] = useState(""); const [schedule, setSchedule] = useState<Schedule[]>([]); const [loading, setLoading] = useState(true); const [scheduleLoading, setScheduleLoading] = useState(false);
  const [error, setError] = useState(""); const [scheduleError, setScheduleError] = useState(""); const [quote, setQuote] = useState<BookingQuote | null>(null); const [quoting, setQuoting] = useState(false); const [busy, setBusy] = useState(false);
  const carousel = useRef<HTMLDivElement>(null); const heading = useRef<HTMLHeadingElement>(null);
  const bike = products.find(p => p.id === draft.productId);
  const coach = coaches.find(c => c.id === draft.coachId);
  const duration = draft.slots.reduce((sum, slot) => sum + (Number(slot.end.slice(0, 2)) * 60 + Number(slot.end.slice(3)) - Number(slot.start.slice(0, 2)) * 60 - Number(slot.start.slice(3))) / 60, 0);
  const price = (product: RentalProduct) => product.pricePerHour != null ? Number(product.pricePerHour) * duration : Number(product.pricePerDay || 0);
  const gear = draft.accessories.map(selection => ({ selection, product: products.find(p => p.id === selection.productId) })).filter((item): item is { selection: BookingDraft["accessories"][number]; product: RentalProduct } => Boolean(item.product));
  const preview = (bike ? price(bike) * (draft.quantity || 1) : 0) + gear.reduce((sum, item) => sum + price(item.product) * item.selection.quantity, 0) + (coach ? Number(coach.hourlyRate) * duration : 0);

  useEffect(() => {
    const controller = new AbortController();
    void bookingRequest<{ products: RentalProduct[]; coaches: RentalCoach[] }>("catalog", undefined, controller.signal).then(result => {
      setProducts(result.products); setCoaches(result.coaches);
      let saved: { draft?: BookingDraft; step?: number } = {};
      try { saved = JSON.parse(sessionStorage.getItem(storageKey) || "{}"); } catch { /* A fresh booking still works without storage. */ }
      const previous = saved.draft;
      const productId = requestedBike || previous?.productId || result.products.find(p => p.category === "bike")?.id || "";
      const reuse = previous?.productId === productId && Array.isArray(previous.slots) && Array.isArray(previous.accessories) && previous.bookingDate >= todayPacific();
      const selectedBike = result.products.find(p => p.id === productId);
      const quantity = Math.min(Math.max(1, selectedBike?.stockQuantity || 1), Math.max(1, Math.floor(previous?.quantity || 1)));
      setDraft(reuse ? { ...previous, quantity, accessories: previous.accessories.filter(item => result.products.some(p => p.id === item.productId)).map(item => ({ ...item, quantity: Math.min(quantity, Math.max(1, result.products.find(p => p.id === item.productId)?.stockQuantity || 1), Math.max(1, Math.floor(item.quantity || 1))) })), coachId: result.coaches.some(c => c.id === previous.coachId) ? previous.coachId : undefined } : { ...empty, productId });
      setWeek(monday(reuse ? previous.bookingDate : todayPacific()));
      setStep(reviewRequested && reuse ? 5 : reuse && Number.isInteger(saved.step) ? Math.min(5, Math.max(0, saved.step!)) : 0);
      setReady(true); setLoading(false);
      if (!result.products.some(p => p.id === productId && p.category === "bike")) setError("This bike is unavailable. Please return to the bike listings to choose your ride.");
    }).catch(err => { if (!controller.signal.aborted) { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, [requestedBike, reviewRequested]);

  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify({ draft, step })); } catch { /* Storage is optional. */ }
  }, [draft, step, ready]);

  useEffect(() => {
    if (!draft.productId || !week) return;
    const controller = new AbortController(); setScheduleLoading(true); setScheduleError("");
    const dates = Array.from({ length: 7 }, (_, index) => addDays(week, index));
    void Promise.all(dates.map(date => date < todayPacific() ? Promise.resolve({ date, slots: [] }) : bookingRequest<Schedule>(`availability/${draft.productId}?date=${date}`, undefined, controller.signal))).then(rows => { setSchedule(rows); setScheduleLoading(false); }).catch(err => { if (!controller.signal.aborted) { setScheduleError(err.message); setScheduleLoading(false); } });
    return () => controller.abort();
  }, [draft.productId, week]);

  useEffect(() => {
    if (step !== 5 || !user || !draft.slots.length) return;
    const controller = new AbortController(); setQuoting(true); setQuote(null); setError("");
    void bookingRequest<BookingQuote>("quote", draft, controller.signal).then(result => { setQuote(result); setQuoting(false); }).catch(err => { if (!controller.signal.aborted) { setError(err.message); setQuoting(false); } });
    return () => controller.abort();
  }, [step, draft, user]);

  function go(next: number) {
    if (next > 0 && (!bike || !draft.bookingDate || !draft.slots.length)) { setError("Choose your bike, date and at least one available time slot."); return; }
    setError(""); setStep(next); carousel.current?.scrollTo({ left: 0 });
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  }
  function selectSlot(date: string, slot: Slot) {
    setError(""); setQuote(null);
    setDraft(old => ({ ...old, bookingDate: date, slots: old.bookingDate === date && old.slots.some(s => s.start === slot.start && s.end === slot.end) ? old.slots.filter(s => s.start !== slot.start || s.end !== slot.end) : [...(old.bookingDate === date ? old.slots : []), { start: slot.start, end: slot.end }].sort((a, b) => a.start.localeCompare(b.start)) }));
  }
  function changeBikeQuantity(value: number) {
    const quantity = Math.min(Math.max(1, bike?.stockQuantity || 1), Math.max(1, Math.floor(value || 1)));
    setQuote(null);
    setDraft(old => ({ ...old, quantity, accessories: old.accessories.map(item => ({ ...item, quantity: Math.min(quantity, item.quantity, Math.max(1, products.find(product => product.id === item.productId)?.stockQuantity || 1)) })) }));
  }
  function selectGear(product: RentalProduct, size?: string) {
    setQuote(null);
    setDraft(old => ({ ...old, accessories: [...old.accessories.filter(item => (products.find(p => p.id === item.productId)?.attributes?.rentalGroup || products.find(p => p.id === item.productId)?.category) !== groups[step - 1]), { productId: product.id, size: size || "M", quantity: 1 }] }));
  }
  function skip() {
    if (step === 4) setDraft(old => ({ ...old, coachId: undefined }));
    else setDraft(old => ({ ...old, accessories: old.accessories.filter(item => (products.find(p => p.id === item.productId)?.attributes?.rentalGroup || products.find(p => p.id === item.productId)?.category) !== groups[step - 1]) }));
    go(step + 1);
  }
  async function checkout() {
    if (busy || !quote) return;
    setBusy(true); setError("");
    try {
      const result = await bookingRequest<{ url: string }>("checkout", draft);
      const url = new URL(result.url);
      if (url.origin !== window.location.origin || url.pathname !== "/booking/checkout") throw new Error("Unable to open secure checkout.");
      router.push(url.pathname + url.search);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to start checkout."); setBusy(false); }
  }
  const options = products.filter(p => (p.attributes?.rentalGroup || p.category) === groups[step - 1]).sort((a, b) => (a.attributes?.variant || 0) - (b.attributes?.variant || 0));
  const visibleDate = schedule.some(row => row.date === viewDate) ? viewDate : schedule.some(row => row.date === draft.bookingDate) ? draft.bookingDate : schedule.find(row => row.date >= todayPacific() && row.slots.length)?.date || "";
  const returnUrl = `/booking${draft.productId ? `?bike=${encodeURIComponent(draft.productId)}` : ""}`;

  return <div className={`${shared.page} ${s.page}`}><PublicSiteHeader activePath="" compact /><main className={s.main}>
    <h1>Checkout</h1>{params.get("expired") && <p className={s.notice} role="status">Your five-minute checkout expired. Your equipment was released. Review your selection and confirm again if it is still available.</p>}{params.get("returned") && <p className={s.notice} role="status">You are back at confirmation. Your equipment was released; availability will be checked before you pay.</p>}
    {loading ? <BookingSkeleton /> : <>
      <nav className={s.progress} aria-label="Booking steps">{titles.map((title, index) => <button key={title} type="button" aria-label={`Step ${index + 1}: ${title}`} aria-current={index === step ? "step" : undefined} disabled={busy || index > step} onClick={() => go(index)} className={index <= step ? s.reached : ""}>{index < step ? <FiCheck aria-hidden="true" /> : index + 1}</button>)}</nav>
      {params.get("cancelled") && <p className={s.notice} role="status">Checkout was cancelled. Your equipment reservation has been released. Availability will be checked again before checkout.</p>}
      {error && <p className={s.error} role="alert">{error}</p>}
      {step === 0 ? <section className={s.availability} aria-labelledby="booking-heading">
        <div className={s.bookingOptions}><div className={s.lockedBike}>{bike?.images[0] && <img className={s.selectedBikePhoto} src={bike.images[0]} alt={bike.name} />}<div className={s.selectedBikeInfo}><span>Your bike</span><strong>{bike?.name || "Bike unavailable"}</strong>{(bike?.stockQuantity || 0) > 1 && <label className={s.quantityField}>Quantity<input type="number" min="1" max={bike?.stockQuantity} value={draft.quantity || 1} onChange={event => changeBikeQuantity(Number(event.target.value))} /></label>}<small>{bike?.stockQuantity || 0} {(bike?.stockQuantity || 0) === 1 ? "unit" : "units"} in inventory</small></div></div><div className={s.weekControls}><button aria-label="Previous week" disabled={!week || week <= monday(todayPacific()) || scheduleLoading} onClick={() => setWeek(addDays(week, -7))}><FiArrowLeft /></button><label>Week of<input type="date" value={week} min={monday(todayPacific())} max={addDays(todayPacific(), 350)} onChange={e => { if (e.target.value) setWeek(monday(e.target.value)); }} /></label><button aria-label="Next week" disabled={!week || week >= addDays(todayPacific(), 343) || scheduleLoading} onClick={() => setWeek(addDays(week, 7))}><FiArrowRight /></button></div></div>
        <h2 id="booking-heading" ref={heading} tabIndex={-1}>Bike Availability</h2><p className={s.hint}>All times are Pacific time. Choose one or more sessions on the same date.</p>
        {scheduleError && <p className={s.error} role="alert">{scheduleError}</p>}
        <div className={s.dateTabs} aria-label="Choose a ride date">{schedule.map(row => <button key={row.date} type="button" aria-pressed={visibleDate === row.date} disabled={row.date < todayPacific() || !row.slots.length} onClick={() => setViewDate(row.date)}><strong>{new Date(`${row.date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}</strong><span>{new Date(`${row.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span></button>)}</div>
        <div className={s.schedule} aria-busy={scheduleLoading}>{scheduleLoading ? <BookingSkeleton scheduleOnly /> : schedule.filter(row => row.date === visibleDate).map(row => <div className={s.scheduleRow} key={row.date}><div><strong>{new Date(`${row.date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })}</strong><small>{new Date(`${row.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</small></div><div className={s.slots}>{row.slots.length ? row.slots.map(slot => { const selected = draft.bookingDate === row.date && draft.slots.some(s => s.start === slot.start && s.end === slot.end); const past = `${row.date} ${slot.start}` <= new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()); return <button key={slot.start} aria-pressed={selected} disabled={!slot.available || (slot.remaining ?? 1) < (draft.quantity || 1) || past || scheduleLoading} onClick={() => selectSlot(row.date, slot)}>{slot.start} – {slot.end}{!slot.available && <span className={s.srOnly}> (reserved)</span>}</button>; }) : <span className={s.hint}>{row.date < todayPacific() ? "Past date" : "No sessions available"}</span>}</div></div>)}</div>
        {draft.slots.length > 0 && <div className={s.selection} role="status"><div><span>Your ride date</span><strong>{bookingDateLabel(draft.bookingDate)}</strong><p>{bookingSessionLabel(draft.slots)} <small>Pacific time</small></p></div><div className={s.selectionPrice}><span>Bike rental</span><strong>{money(bike ? price(bike) : 0)}</strong></div></div>}
        <div className={`${s.actions} ${s.scheduleActions}`}><Link className={s.back} href="/bikes">Back</Link><button className={s.next} disabled={!ready || !bike || !draft.slots.length || scheduleLoading} onClick={() => go(1)}>Next</button></div>
      </section> : <section className={s.stage} aria-labelledby="booking-heading">
        <h2 id="booking-heading" ref={heading} tabIndex={-1}>{titles[step]}</h2><div className={s.stageContent}>
          {step < 5 && <button className={s.skip} onClick={skip}>Skip this step <FiArrowRight aria-hidden="true" /></button>}
          {step <= 3 && <><button className={s.scrollPrevious} aria-label="Show previous gear" onClick={() => carousel.current?.scrollBy({ left: -300, behavior: "smooth" })}><FiArrowLeft /></button><div className={`${s.carousel} ${s.gear}`} ref={carousel} data-group={groups[step - 1]}>{options.map((product, index) => {
            const selection = draft.accessories.find(item => item.productId === product.id); const featured = Boolean(selection || (index === 0 && !draft.accessories.some(item => options.some(p => p.id === item.productId))));
            const sizes = product.helmetSpec?.sizes || product.suitSpec?.sizes || product.attributes?.sizes || ["S", "M", "L"];
            return <article className={`${s.card} ${featured ? s.featured : ""}`} key={product.id} data-variant={product.attributes?.variant}><button className={s.photo} aria-label={`Choose ${product.name}, option ${index + 1}`} aria-pressed={Boolean(selection)} onClick={() => selectGear(product, selection?.size)}>{product.images[0] && <span className={s.imageSlot}><img src={product.images[0]} alt={`${product.name}, option ${index + 1}`} /></span>}</button><div className={s.sizes} aria-label={`Size for ${product.name}, option ${index + 1}`}>{sizes.map(size => <button key={size} aria-label={`Choose size ${size} for ${product.name}, option ${index + 1}`} aria-pressed={selection?.size === size} onClick={() => selectGear(product, size)}>{size}</button>)}</div>{selection && Math.min(draft.quantity || 1, product.stockQuantity) > 1 && <label className={s.quantityField}>Quantity<input type="number" min="1" max={Math.min(draft.quantity || 1, product.stockQuantity)} value={selection.quantity} onChange={event => setDraft(old => ({ ...old, accessories: old.accessories.map(item => item.productId === product.id ? { ...item, quantity: Math.min(draft.quantity || 1, product.stockQuantity, Math.max(1, Math.floor(Number(event.target.value) || 1))) } : item) }))} /></label>}<h3 className={step === 1 && !featured ? s.hiddenName : ""}>{product.name}</h3><p className={s.price}>{money(product.pricePerHour != null ? Number(product.pricePerHour) : Number(product.pricePerDay))}{product.pricePerHour != null ? "/hr" : ""}</p></article>;
          })}{!options.length && <p>No gear is available. You can skip this step.</p>}</div><button className={s.scrollNext} aria-label="Show more gear" onClick={() => carousel.current?.scrollBy({ left: 300, behavior: "smooth" })}><FiArrowRight /></button></>}
          {step === 4 && <><button className={s.scrollPrevious} aria-label="Show previous coaches" onClick={() => carousel.current?.scrollBy({ left: -300, behavior: "smooth" })}><FiArrowLeft /></button><div className={`${s.carousel} ${s.coaches}`} ref={carousel}>{coaches.map((item, index) => { const featured = draft.coachId === item.id || (!draft.coachId && index === 0); return <article className={`${s.card} ${featured ? s.featured : ""}`} key={item.id}><button className={s.photo} aria-label={`Choose coach ${item.firstName} ${item.lastName}`} aria-pressed={draft.coachId === item.id} onClick={() => setDraft(old => ({ ...old, coachId: item.id }))}>{item.profileImage && <img src={item.profileImage} alt={`${item.firstName} ${item.lastName}`} />}{featured && <span className={s.coachRate}>{money(Number(item.hourlyRate))}/hr</span>}</button>{featured && <><h3>{item.firstName} {item.lastName}</h3><p className={s.specialty}>{item.specialty}</p><p className={s.bio}>{item.bio}</p></>}</article>; })}{!coaches.length && <p>No coaches are available. You can skip this step.</p>}</div><button className={s.scrollNext} aria-label="Show more coaches" onClick={() => carousel.current?.scrollBy({ left: 300, behavior: "smooth" })}><FiArrowRight /></button></>}
          {step === 5 && <><p className={s.summaryDate}>{bike?.name} &middot; {bookingDateLabel(draft.bookingDate)} &middot; {bookingSessionLabel(draft.slots)} (Pacific time)</p><div className={s.summary}>{bike && <SummaryItem image={bike.images[0]} name={bike.name} detail={`Off-Road Dirt Bike, quantity ${draft.quantity || 1}`} amount={price(bike) * (draft.quantity || 1)} />}{gear.map(({ product, selection }) => <SummaryItem key={product.id} image={product.images[0]} name={product.name} detail={`Size: ${{ S: "Small", M: "Medium", L: "Large" }[selection.size] || selection.size}`} amount={price(product) * selection.quantity} />)}{coach && <SummaryItem image={coach.profileImage} name={`${coach.firstName} ${coach.lastName}`} detail={`${coach.specialty} · ${duration} ${duration === 1 ? "hour" : "hours"}`} amount={Number(coach.hourlyRate) * duration} />}</div><div className={s.total}><span>Total</span><strong>{quoting ? "Calculating…" : money(quote ? quote.totalAmount / 100 : preview)}</strong></div><label className={s.notes}>Booking notes (optional)<textarea maxLength={2000} value={draft.notes || ""} onChange={e => setDraft(old => ({ ...old, notes: e.target.value }))} placeholder="Anything we should know before your ride?" /></label>{!loadingAuth && !user && <p className={s.notice}><Link href={`/sign-in?next=${encodeURIComponent(returnUrl)}`}>Sign in or create an account</Link> to confirm your booking. Your selections will be saved.</p>}</>}
          <div className={s.actions}><button className={s.back} disabled={busy} onClick={() => go(step - 1)}>Back</button>{step === 5 ? <button className={s.next} disabled={!user || loadingAuth || !quote || quoting || busy} onClick={() => void checkout()}>{busy ? "Opening Stripe…" : "Confirm"}</button> : <button className={s.next} onClick={() => go(step + 1)}>Next</button>}</div>
          {step === 5 && user && <p className={s.checkoutHint}>Secure payment with Stripe · Test checkout</p>}
        </div>
      </section>}
    </>}
  </main><PublicSiteFooter /></div>;
}
function SummaryItem({ image, name, detail, amount }: { image?: string; name: string; detail: string; amount: number }) { return <article className={s.summaryItem}>{image && <img src={image} alt={name} />}<div><h3>{name}</h3><p>{detail}</p><strong>{money(amount)}</strong></div></article>; }
