"use client";
import Link from "next/link";
import { useState } from "react";
import { rideMoney, rideRequest, type RideRequest, type RideParticipant } from "@/services/ride-requests";
import s from "./ride-receipts.module.css";
export default function RideParticipantProgress({ request, admin = false, riderIndex }: { request: RideRequest; admin?: boolean; riderIndex?: number }) {
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const participants: RideParticipant[] = request.participants?.length ? request.participants : request.status === "requested" ? request.draft.riders.map((rider, index) => ({
    id: "", riderIndex: index, name: rider.name, signedAt: null, paidAt: null,
    amountCents: request.estimate.items.filter(item => item.coachId
      ? request.draft.coachMode === "individual" ? item.coachId === rider.coachId : index === 0
      : item.riderIndex === index).reduce((sum, item) => sum + (item.included ? 0 : item.amount), 0),
  })) : [];
  if (!participants.length) return null;
  async function resend(id: string) {
    setBusy(id); setMessage(""); setError("");
    try { const result = await rideRequest<{ message: string }>(`riders/${id}/resend`, "POST", {}); setMessage(result.message); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to resend the link."); }
    finally { setBusy(""); }
  }
  return <section className={s.progress} aria-label="Rider waivers and payments">{riderIndex === undefined && <h4>Waivers &amp; individual payments</h4>}
    {participants.filter(rider => riderIndex === undefined || rider.riderIndex === riderIndex).sort((a, b) => a.riderIndex - b.riderIndex).map(rider => <div className={s.progressRow} key={rider.riderIndex}><div>{riderIndex === undefined && <strong>{admin ? rider.name : rider.riderIndex === 0 ? "You" : `Buddy · ${rider.name}`}</strong>}<strong className={rider.paidAt ? s.paidText : undefined}>{rideMoney(rider.amountCents)} · {rider.paidAt ? "Payment paid" : "Payment pending"}</strong><small>{rider.signedAt ? "Liability waiver signed" : "Liability waiver signing pending"}</small></div>
      {request.status === "pending_payment" && !!rider.id && !rider.paidAt && <div className={s.progressActions}>{!admin && rider.riderIndex === 0 ? <Link href={`/ride/complete/${rider.id}`}>{rider.signedAt ? "Continue to payment" : "Sign waiver & pay"}</Link> : <button type="button" disabled={!!busy} onClick={() => void resend(rider.id)}>{busy === rider.id ? "Sending…" : "Resend personal link"}</button>}</div>}
    </div>)}{message && <p role="status">{message}</p>}{error && <p className={s.error} role="alert">{error}</p>}
  </section>;
}
