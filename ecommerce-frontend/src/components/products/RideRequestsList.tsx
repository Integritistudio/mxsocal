"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { rideRequestTabs, matchesRequestTab, rideRequest, rideMoney, type RideRequest } from "@/services/ride-requests";
import s from "./admin-products.module.css";
import publicStyle from "../public-site/ride-booking.module.css";
import RideRequestReceipts from "../public-site/RideRequestReceipts";
import RideParticipantProgress from "../public-site/RideParticipantProgress";
export default function RideRequestsList({ admin = false }: { admin?: boolean }) {
  const [tab, setTab] = useState("all");
  const { hasPermission } = useUser();
  const [requests, setRequests] = useState<RideRequest[]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [revision, setRevision] = useState(0); const [busy, setBusy] = useState(""); const [notes, setNotes] = useState<Record<string, string>>({});
  useEffect(() => {
    const controller = new AbortController();
    void rideRequest<{ requests: RideRequest[] }>(admin ? "admin" : "mine", "GET", undefined, controller.signal).then(data => { setRequests(data.requests); setLoading(false); setError(""); }).catch(err => { if (!controller.signal.aborted) { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, [admin, revision]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (!document.hidden) setRevision(value => value + 1); }, 60000);
    return () => window.clearInterval(timer);
  }, []);
  const visible = requests.filter(request => matchesRequestTab(request, tab));
  async function review(id: string, status: string) {
    if (busy) return; setBusy(id); setError("");
    try { const result = await rideRequest<{ request: RideRequest }>(`admin/${id}`, "PATCH", { status, note: notes[id] || "" }); setRequests(previous => previous.map(row => row.id === id ? { ...row, ...result.request } : row)); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to review this request."); }
    finally { setBusy(""); }
  }
  if (!admin) return <RideRequestReceipts requests={requests} loading={loading} error={error} onRefresh={() => { setLoading(true); setRevision(n => n + 1); }} />;
  return <section className={`${s.panel} ${!admin ? publicStyle.customerRequests : ""}`}><div className={s.header}><div><h2>{admin ? "Ride requests" : "My ride requests"}</h2><p className={s.hint}>Track, dates and equipment for the whole group. After review, every rider signs a waiver and pays individually.</p></div><button type="button" className={s.button} onClick={() => { setLoading(true); setRevision(n => n + 1); }}>Refresh</button></div><div className={s.actions} role="group" aria-label="Filter ride requests">{rideRequestTabs.map(item => <button type="button" key={item.key} className={`${s.button} ${tab !== item.key ? s.secondary : ""}`} aria-pressed={tab === item.key} onClick={() => setTab(item.key)}>{item.label} ({requests.filter(request => matchesRequestTab(request, item.key)).length})</button>)}</div>{error && <p className={s.error} role="alert">{error}</p>}{loading ? <p role="status">Loading ride requests…</p> : !visible.length ? <p className={s.empty}>No ride requests in this category.</p> : visible.map(request => <article key={request.id} className={s.group} style={{ marginBlock: 20 }}><div className={s.header}><div><h3>{request.estimate.track?.name || "Ride booking"}</h3><p>{request.startDate} – {request.endDate} · {request.estimate.dates.length} days · {request.draft.riders.length} riders</p>{admin && <p>{request.User?.name} · {request.User?.email} · {request.User?.phone}</p>}</div><div><strong>{rideMoney(request.estimate.totalAmount)}</strong><p>{request.status === "requested" ? "Awaiting admin approval" : request.status === "pending_payment" ? "Pending payment" : request.status === "approved" ? "Approved" : request.expiredAt ? "Rejected - expired" : request.status}</p></div></div><p className={s.hint}>Reference: {request.id}</p><RideParticipantProgress request={request} admin={admin} /><details><summary>View group & equipment</summary>{request.draft.riders.map((rider, i) => <section key={i} className={s.section}><h3>{rider.name}{i === 0 ? " (Customer)" : " (Buddy)"}</h3><p>{rider.email} · {rider.phone || "Phone not provided"}</p><div className={s.lineItems}>{request.estimate.items.filter(item => item.riderIndex === i).map((item, n) => <div key={n}><span>{item.name}{item.size ? ` · ${item.size}` : ""}{!item.included && <> / {rideMoney(item.dailyAmount)} per day x {item.days}</>}</span><strong>{item.included ? "Included" : rideMoney(item.amount)}</strong></div>)}</div></section>)}{request.estimate.items.filter(item => item.coachId).map(item => <p key={item.coachId}>Coach: {item.name}{item.assignmentLabel ? ` (${item.assignmentLabel})` : ""} ? {rideMoney(item.dailyAmount)}/day</p>)}{request.draft.notes && <p>Customer note: {request.draft.notes}</p>}</details>{request.adminNote && <p role="status">Team note: {request.adminNote}</p>}{admin && hasPermission("booking:update") && ["requested", "pending_payment", "approved"].includes(request.status) && <div className={s.section}><label className={s.field}>Note for customer<textarea maxLength={1000} value={notes[request.id] || ""} onChange={e => setNotes(previous => ({ ...previous, [request.id]: e.target.value }))} /></label><div className={s.actions}>{request.status === "requested" ? <><button className={s.button} disabled={!!busy} onClick={() => void review(request.id, "approved")}>{busy === request.id ? "Updating…" : "Accept & request payment"}</button><button className={s.smallButton} disabled={!!busy} onClick={() => void review(request.id, "rejected")}>Reject</button></> : <button className={s.smallButton} disabled={!!busy} onClick={() => void review(request.id, "cancelled")}>Cancel & release equipment</button>}</div></div>}</article>)}</section>;
}
