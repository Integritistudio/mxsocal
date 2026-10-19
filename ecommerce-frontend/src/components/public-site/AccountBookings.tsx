/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { bookingRequest } from "@/services/booking";
import { bookingDateLabel, bookingSessionLabel } from "./booking-format";
import s from "./customer-account.module.css";
type AccountBooking = { id: string; quantity: number; bookingDate: string; slots: { start: string; end: string }[]; status: string; paymentStatus: string; totalPrice: string; currency: string; product: { name: string; slug: string; image?: string } | null; accessories: { name: string; size?: string; quantity: number }[]; coach: { name: string; specialty?: string } | null; notes?: string };
export default function AccountBookings() {
  const [period, setPeriod] = useState("upcoming"); const [bookings, setBookings] = useState<AccountBooking[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void bookingRequest<{ bookings: AccountBooking[] }>(`mine?period=${period}`, undefined, controller.signal).then(result => { setBookings(result.bookings); setLoading(false); }).catch(err => { if (!controller.signal.aborted) { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, [period, retry]);
  function filter(value: string) { setLoading(true); setError(""); setPeriod(value); }
  return <section className={s.panel}><div className={s.bookingsHeading}><h2>My bookings</h2><div className={s.bookingFilters} aria-label="Filter bookings">{["upcoming", "past"].map(value => <button key={value} aria-pressed={period === value} onClick={() => { if (period !== value) filter(value); }}>{value === "upcoming" ? "Upcoming" : "Past"}</button>)}</div></div>
    {loading ? <div className={s.bookingSkeleton} role="status" aria-label="Loading your bookings" aria-busy="true">{[0, 1].map(i => <div key={i}><span /><span /><span /></div>)}</div> : error ? <><p className={s.error} role="alert">{error}</p><button className={s.secondary} onClick={() => { setError(""); setLoading(true); setRetry(n => n + 1); }}>Try again</button></> : !bookings.length ? <p className={s.intro}>{period === "upcoming" ? "You have no upcoming bookings." : "You have no past bookings."} <Link href="/bikes">Explore bikes</Link></p> : <div className={s.bookingList}>{bookings.map(booking => <article key={booking.id} className={s.bookingCard}>
      {booking.product?.image && <img className={s.bookingImage} src={booking.product.image} alt={booking.product.name} />}<div className={s.bookingDetails}><div className={s.bookingTitle}><h3>{booking.product?.name || "Bike rental"}{booking.quantity > 1 ? ` (x${booking.quantity})` : ""}</h3><span className={s.bookingBadge} data-status={booking.status}>{booking.status === "pending" ? "Awaiting payment" : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span></div><p className={s.bookingDate}>{bookingDateLabel(booking.bookingDate)}</p><p>{bookingSessionLabel(booking.slots)} <small>Pacific time</small></p>{booking.accessories.length > 0 && <p className={s.bookingExtras}>Gear: {booking.accessories.map(item => `${item.name}${item.size ? ` (${item.size})` : ""}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`).join(", ")}</p>}{booking.coach && <p className={s.bookingExtras}>Coach: {booking.coach.name}</p>}{booking.notes && <p className={s.bookingExtras}>Notes: {booking.notes}</p>}<div className={s.bookingFooter}><span>Reference: {booking.id.slice(0, 8).toUpperCase()}</span><strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: booking.currency }).format(Number(booking.totalPrice))}<small>{booking.paymentStatus === "paid" ? "Paid" : booking.paymentStatus === "failed" ? "Payment failed" : "Payment pending"}</small></strong></div></div>
    </article>)}</div>}
  </section>;
}
