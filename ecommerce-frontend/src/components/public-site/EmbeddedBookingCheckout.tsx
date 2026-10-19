"use client";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@/context/UserContext";
import { bookingRequest } from "@/services/booking";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";
import shared from "./contact-design.module.css";
import s from "./booking.module.css";
type Embedded = { mount: (element: HTMLElement) => void; destroy: () => void };
type StripeClient = { initEmbeddedCheckout: (options: { fetchClientSecret: () => Promise<string>; onComplete: () => void }) => Promise<Embedded> };
declare global { interface Window { Stripe?: (key: string) => StripeClient } }
export default function EmbeddedBookingCheckout() {
  const id = useSearchParams().get("session_id") || ""; const router = useRouter(); const { user, loadingAuth } = useUser();
  const [scriptReady, setScriptReady] = useState(false); const [seconds, setSeconds] = useState(300); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [retry, setRetry] = useState(0);
  const element = useRef<HTMLDivElement>(null); const completed = useRef(false); const releaseStarted = useRef(false); const product = useRef("");
  async function leave(reason = "returned") {
    if (releaseStarted.current || completed.current) return;
    releaseStarted.current = true; setBusy(true); setError("");
    try {
      const result = await bookingRequest<{ released: boolean; paymentStatus: string; productId: string }>(`sessions/${id}/release`, {});
      if (result.paymentStatus === "paid") { completed.current = true; router.replace(`/booking/success?session_id=${id}`); }
      else if (result.released) { completed.current = true; router.replace(`/booking?bike=${result.productId}&review=1&${reason}=1`); }
      else throw new Error("Your payment is being processed. Please wait while we verify it.");
    } catch (err) { releaseStarted.current = false; setBusy(false); setError(err instanceof Error ? err.message : "Unable to release checkout. Please try again."); }
  }
  const leaveRef = useRef(leave); leaveRef.current = leave;
  useEffect(() => {
    if (!scriptReady || loadingAuth || !user) return;
    let cancelled = false; let embedded: Embedded | undefined; let interval: ReturnType<typeof setInterval> | undefined; let initialized = false;
    const unload = () => { if (initialized && !completed.current) navigator.sendBeacon(`/api/booking/sessions/${id}/release`, new Blob(["{}"], { type: "application/json" })); };
    async function start() {
      try {
        if (!/^cs_test_[A-Za-z0-9]+$/.test(id)) throw new Error("Invalid checkout session.");
        const data = await bookingRequest<{ clientSecret: string | null; publishableKey: string; holdUntil: string; paymentStatus: string; productId: string }>(`sessions/${id}/embedded`);
        if (cancelled) return;
        product.current = data.productId;
        if (data.paymentStatus === "paid") { completed.current = true; router.replace(`/booking/success?session_id=${id}`); return; }
        if (!data.clientSecret || Date.parse(data.holdUntil) <= Date.now()) { await leaveRef.current("expired"); return; }
        if (!window.Stripe || !data.publishableKey?.startsWith("pk_test_")) throw new Error("Secure checkout is not configured.");
        const tick = () => { const remaining = Math.max(0, Math.ceil((Date.parse(data.holdUntil) - Date.now()) / 1000)); setSeconds(remaining); if (!remaining) void leaveRef.current("expired"); };
        tick(); interval = setInterval(tick, 1000);
        embedded = await window.Stripe(data.publishableKey).initEmbeddedCheckout({ fetchClientSecret: async () => data.clientSecret!, onComplete: () => { completed.current = true; router.replace(`/booking/success?session_id=${id}`); } });
        if (cancelled) { embedded.destroy(); return; }
        if (element.current) embedded.mount(element.current);
        initialized = true; window.addEventListener("pagehide", unload);
      } catch (err) { if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load secure checkout."); }
    }
    void start();
    return () => { cancelled = true; if (interval) clearInterval(interval); window.removeEventListener("pagehide", unload); embedded?.destroy(); unload(); };
  }, [scriptReady, loadingAuth, user, id, router, retry]);
  return <div className={`${shared.page} ${s.page}`}><Script src="https://js.stripe.com/v3/" onReady={() => setScriptReady(true)} onError={() => setError("Unable to load Stripe. Check your connection and try again.")} /><PublicSiteHeader activePath="" compact /><main className={s.main}><div className={s.checkoutHeader}><div><h1>Secure checkout</h1><p>Your equipment is reserved while you pay.</p></div><div className={s.checkoutTimer} role="timer" aria-label={`${seconds} seconds remaining`}>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}<small>remaining</small></div></div>{error && <p className={s.error} role="alert">{error}</p>}{!loadingAuth && !user ? <a className={s.next} href={`/sign-in?next=${encodeURIComponent(`/booking/checkout?session_id=${id}`)}`}>Sign in to continue</a> : <><div className={s.embeddedCheckout} ref={element} />{!scriptReady && <div className={s.checkoutSpinner} role="status" aria-label="Loading secure checkout" />}</>}<div className={s.actions}><button className={s.back} disabled={busy} onClick={() => void leave()}>{busy ? "Releasing reservation…" : "Back to confirmation"}</button>{error && <button className={s.next} disabled={busy} onClick={() => { setError(""); setRetry(n => n + 1); }}>Try again</button>}</div><p className={s.checkoutHint}>After five minutes, checkout closes and your equipment is released. Availability is checked again before another attempt.</p></main><PublicSiteFooter /></div>;
}
