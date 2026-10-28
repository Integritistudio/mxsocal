"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { rideMoney, type RideEstimate } from "@/services/ride-requests";
import s from "./ride-participant-checkout.module.css";
type Checkout = { id: string; name: string; amountCents: number; signedAt: string | null; paidAt: string | null; status: string; startDate: string; endDate: string; track?: string; items: RideEstimate["items"]; terms: { version: string; title: string; sections: { title: string; text: string }[] }; requiresGuardian: boolean; canComplete: boolean };
export default function RideParticipantCheckout({ id }: { id: string }) {
  const [data, setData] = useState<Checkout | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [signature, setSignature] = useState("");
  const [role, setRole] = useState("self");
  const [accepted, setAccepted] = useState(false);
  const [adult, setAdult] = useState(false);
  const api = useCallback(async <T,>(action = "", body?: unknown): Promise<T> => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    const response = await fetch(`/api/ride-requests/riders/${id}${action ? `/${action}` : ""}`, { method: body === undefined ? "GET" : "POST", cache: "no-store", headers: { "Content-Type": "application/json", ...(token ? { "x-ride-token": token } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Unable to complete this step.");
    return result;
  }, [id]);
  const refresh = useCallback(async () => {
    setError(""); setBusy(true);
    try { const result = await api<Checkout>(); setData(result); if (result.requiresGuardian) setRole("guardian"); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load your ride."); }
    finally { setBusy(false); }
  }, [api]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!data?.signedAt || data.status !== "pending_payment") return;
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 15000);
    return () => window.clearInterval(timer);
  }, [data?.signedAt, data?.status, refresh]);
  async function sign(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { setData(await api<Checkout>("waiver", { signature, signerRole: role, accepted, adultConfirmed: adult, version: data?.terms.version })); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to save your signature."); }
    finally { setBusy(false); }
  }
  async function pay() {
    setBusy(true); setError("");
    try { const result = await api<{ url: string }>("checkout", {}); window.location.assign(result.url); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to start payment."); setBusy(false); }
  }
  return <main className={s.page}><div className={s.card}><p className={s.eyebrow}>Complete your ride booking</p><h1>{data?.name || "Your waiver & payment"}</h1>
    {error && <p className={s.error} role="alert">{error}</p>}
    {!data ? <><p role="status">{busy ? "Loading your personal booking…" : "Open your personal email link or sign in to your account to continue."}</p><button disabled={busy} onClick={() => void refresh()}>Try again</button><Link href={`/sign-in?next=${encodeURIComponent(`/ride/complete/${id}`)}`}>Sign in to continue</Link></> : <>
      <p>{data.track || "MXSoCal ride"}<br />{data.startDate} – {data.endDate}</p><ol className={s.steps}><li data-done={!!data.signedAt}>1. {data.signedAt ? "Waiver signed" : "Sign liability waiver"}</li><li data-done={!!data.paidAt}>2. {data.paidAt ? "Payment complete" : "Individual payment"}</li></ol>
      <div className={s.items}>{data.items.map((item, i) => <div key={i}><span>{item.name}{item.size ? ` (${item.size})` : ""}{item.coachId && <small> {item.assignmentLabel === "Whole group" ? "Group coach · charged to account owner" : "Your coach"}</small>}</span><strong>{item.included ? "Included" : rideMoney(item.amount)}</strong></div>)}<div className={s.total}><span>Your total</span><strong>{rideMoney(data.amountCents)}</strong></div></div>
      {data.paidAt ? <section className={s.notice}><h2>{data.status === "approved" ? "Your ride is approved" : "Your waiver and payment are complete"}</h2><p>{data.status === "approved" ? "Everyone has signed and paid. Your ride now appears in upcoming rides." : "The group will be approved once every rider has signed and paid."}</p><button disabled={busy} onClick={() => void refresh()}>Refresh status</button></section> : !data.canComplete ? <p className={s.notice}>This booking cannot currently accept a waiver or payment. Contact MXSoCal for assistance.</p> : !data.signedAt ? <form onSubmit={event => void sign(event)}><h2>{data.terms.title}</h2><div className={s.terms}>{data.terms.sections.map(section => <section key={section.title}><h3>{section.title}</h3><p>{section.text}</p></section>)}</div><p className={s.muted}>Terms version: {data.terms.version}</p>
        <label>Signing as<select value={role} disabled={data.requiresGuardian} onChange={e => setRole(e.target.value)}><option value="self">The adult rider named above</option><option value="guardian">The rider’s parent or legal guardian</option></select></label>
        <label>Full legal name (electronic signature)<input required minLength={2} maxLength={100} autoComplete="name" value={signature} onChange={e => setSignature(e.target.value)} /></label>
        <label className={s.check}><input type="checkbox" required checked={adult} onChange={e => setAdult(e.target.checked)} />I am at least 18 and am {role === "guardian" ? "this rider’s parent or legal guardian" : "the rider named above"}.</label>
        <label className={s.check}><input type="checkbox" required checked={accepted} onChange={e => setAccepted(e.target.checked)} />I have read and accept these terms and agree that my typed name is my electronic signature.</label>
        <button disabled={busy || !accepted || !adult || signature.trim().length < 2}>{busy ? "Saving…" : "Sign waiver & continue"}</button></form> : <section className={s.notice}><h2>Waiver signed</h2><p>Your signature has been saved. Complete your individual payment to finish your part of the booking.</p><button disabled={busy} onClick={() => void pay()}>{busy ? "Opening secure payment…" : `Pay ${rideMoney(data.amountCents)}`}</button><button className={s.secondary} disabled={busy} onClick={() => void refresh()}>Check payment status</button></section>}
      <p className={s.muted}>Every rider signs and pays separately. The group is approved after everyone completes both steps.</p><Link href="/account?tab=bookings">My account & bookings</Link>
    </>}
  </div></main>;
}
