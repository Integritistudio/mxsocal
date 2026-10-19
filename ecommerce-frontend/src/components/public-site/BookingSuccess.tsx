"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { bookingRequest, type BookingQuote, type Slot } from "@/services/booking";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";
import shared from "./contact-design.module.css";
import s from "./booking.module.css";
type Confirmation = { bookingId: string; status: string; paymentStatus: string; bookingDate: string; slots: Slot[]; totalPrice: string; currency: string; items: BookingQuote["items"] };
export default function BookingSuccess() {
  const sessionId = useSearchParams().get("session_id") || ""; const { user, loadingAuth } = useUser();
  const [result, setResult] = useState<Confirmation | null>(null); const [error, setError] = useState(""); const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (loadingAuth || !user) return;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>; let attempts = 0;
    async function check() {
      try {
        if (!/^cs_test_[A-Za-z0-9]+$/.test(sessionId)) throw new Error("This checkout link is invalid.");
        const data = await bookingRequest<Confirmation>(`sessions/${sessionId}`, undefined, controller.signal);
        setResult(data); setError("");
        if (data.paymentStatus === "paid") { try { sessionStorage.removeItem("mxsocal-booking-v1"); } catch { /* Optional storage. */ } }
        else if (++attempts < 5) timer = setTimeout(check, 2500);
      } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Unable to verify payment."); }
    }
    void check(); return () => { controller.abort(); clearTimeout(timer); };
  }, [sessionId, user, loadingAuth, retry]);
  const format = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: result?.currency || "USD" }).format(amount);
  return <div className={`${shared.page} ${s.page}`}><PublicSiteHeader activePath="" compact /><main className={s.main}><h1>Your Booking</h1><section className={s.success} aria-live="polite">
    {loadingAuth ? <p role="status">Loading your account…</p> : !user ? <><h2>Sign in to view your booking</h2><Link className={s.next} href={`/sign-in?next=${encodeURIComponent(`/booking/success?session_id=${sessionId}`)}`}>Sign in</Link></> : error ? <><p className={s.error} role="alert">{error}</p><button className={s.next} onClick={() => setRetry(value => value + 1)}>Try again</button></> : !result ? <p role="status">Verifying your payment with Stripe…</p> : <><h2>{result.paymentStatus === "paid" ? "Your ride is booked!" : "Your payment is being checked"}</h2><p>Booking reference: {result.bookingId}</p><p>{result.bookingDate}<br />{result.slots.map(slot => `${slot.start}–${slot.end}`).join(", ")} · Pacific time</p><ul>{result.items.map((item, index) => <li key={index}><span>{item.name}{item.size ? ` (${item.size})` : ""}</span><span>{format(item.unitAmount * item.quantity / 100)}</span></li>)}</ul><div className={s.total}><span>{result.paymentStatus === "paid" ? "Paid" : "Total"}</span><strong>{format(Number(result.totalPrice))}</strong></div>{result.paymentStatus !== "paid" && <><p>Confirmation appears once Stripe verifies your payment.</p><button className={s.next} onClick={() => setRetry(value => value + 1)}>Check payment again</button></>}<div className={s.actions}><Link className={s.back} href="/bikes">Explore bikes</Link><Link className={s.next} href="/account">My account</Link></div></>}
  </section></main><PublicSiteFooter /></div>;
}
