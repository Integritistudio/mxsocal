"use client";
import Link from "next/link";
import { useState } from "react";
import { rideMoney, rideRequest, type RideRequest } from "@/services/ride-requests";
import s from "./ride-receipts.module.css";
export default function RideParticipantProgress({ request, admin = false }: { request: RideRequest; admin?: boolean }) {
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  if (!request.participants?.length) return null;
  async function resend(id: string) {
    setBusy(id); setMessage(""); setError("");
    try { const result = await rideRequest<{ message: string }>(`riders/${id}/resend`, "POST", {}); setMessage(result.message); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to resend the link."); }
    finally { setBusy(""); }
  }
  return <section className={s.progress} aria-label="Rider waivers and payments"><h4>Waivers &amp; individual payments</h4><p>Every rider signs and pays separately. The group is approved when everyone is done. Any group coach is included in the account owner’s total.</p>
    {[...request.participants].sort((a, b) => a.riderIndex - b.riderIndex).map(rider => <div className={s.progressRow} key={rider.id}><div><strong>{rider.name}{rider.riderIndex === 0 ? " (Account owner)" : ""}</strong><small>{rideMoney(rider.amountCents)} · {rider.signedAt ? "Waiver signed" : "Waiver pending"} · {rider.paidAt ? "Paid" : "Payment pending"}</small></div>
      {request.status === "pending_payment" && !rider.paidAt && <div className={s.progressActions}>{!admin && rider.riderIndex === 0 ? <Link href={`/ride/complete/${rider.id}`}>{rider.signedAt ? "Continue to payment" : "Sign waiver & pay"}</Link> : <button type="button" disabled={!!busy} onClick={() => void resend(rider.id)}>{busy === rider.id ? "Sending…" : "Resend personal link"}</button>}</div>}
    </div>)}{message && <p role="status">{message}</p>}{error && <p className={s.error} role="alert">{error}</p>}
  </section>;
}
