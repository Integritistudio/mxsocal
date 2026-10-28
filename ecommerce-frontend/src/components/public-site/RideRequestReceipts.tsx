/* eslint-disable @next/next/no-img-element */
"use client";
import { useState } from "react";
import Link from "next/link";
import RideParticipantProgress from "./RideParticipantProgress";
import { FiChevronDown, FiRefreshCw } from "react-icons/fi";
import { rideRequestTabs, matchesRequestTab, rideMoney, type RideEstimate, type RideRequest } from "@/services/ride-requests";
import s from "./ride-receipts.module.css";

type Item = RideEstimate["items"][number];
const dateLabel = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const statuses: Record<string, string> = { requested: "Awaiting approval", pending_payment: "Pending payment", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled" };

function ReceiptItem({ item }: { item: Item }) {
  return <div className={s.item}>
    {item.image && <img src={item.image} alt="" loading="lazy" />}
    <div className={s.itemText}><span>{item.name}{item.assignmentLabel && <small> ({item.assignmentLabel})</small>}{item.size && <small>Size {item.size}</small>}</span>{!item.included && <small>{rideMoney(item.dailyAmount)} / day × {item.days} days</small>}</div>
    <strong>{item.included ? "Included" : rideMoney(item.amount)}</strong>
  </div>;
}

export default function RideRequestReceipts({ requests, loading, error, onRefresh }: { requests: RideRequest[]; loading: boolean; error: string; onRefresh: () => void }) {
  const [tab, setTab] = useState("all");
  const visible = requests.filter(request => matchesRequestTab(request, tab));
  return <section className={s.requests} aria-label="My ride requests">
    <div className={s.heading}><div><h2>My ride requests</h2><p>Your ride details and estimated costs.</p></div><button className={s.refresh} type="button" disabled={loading} onClick={onRefresh}><FiRefreshCw className={loading ? s.spinning : undefined} aria-hidden="true" />{loading ? "Refreshing…" : "Refresh"}</button></div>
    <div className={s.tabs} role="group" aria-label="Filter ride requests">{rideRequestTabs.map(item => <button type="button" key={item.key} aria-pressed={tab === item.key} onClick={() => setTab(item.key)}>{item.label} <span>{requests.filter(request => matchesRequestTab(request, item.key)).length}</span></button>)}</div>
    {error && <p className={s.error} role="alert">{error}</p>}
    {loading ? <p className={s.empty} role="status">Loading ride requests…</p> : !visible.length ? <p className={s.empty}>No ride requests in this category.</p> : visible.map(request => <details key={request.id} className={s.receipt}>
      <summary className={s.summary}>
      <header className={s.receiptHeader}><div><span className={s.eyebrow}>Ride request</span><h3>{request.estimate.track?.name || "Your motocross ride"}</h3></div>{request.status === "pending_payment" && request.participants?.some(rider => rider.riderIndex === 0) ? <Link className={s.status} data-status={request.status} href={`/ride/complete/${request.participants.find(rider => rider.riderIndex === 0)!.id}`} onClick={event => event.stopPropagation()}>Pending payment</Link> : <span className={s.status} data-status={request.status}>{request.expiredAt ? "Rejected - expired" : statuses[request.status] || request.status}</span>}</header>
      <div className={s.metaSection}><dl className={s.meta}><div><dt>Dates</dt><dd>{dateLabel(request.startDate)} – {dateLabel(request.endDate)}</dd></div><div><dt>Group</dt><dd>{request.estimate.dates.length} days · {request.draft.riders.length} {request.draft.riders.length === 1 ? "rider" : "riders"}</dd></div><div className={s.reference}><dt>Reference</dt><dd>{request.id}</dd></div></dl>
      {["requested", "pending_payment", "approved"].includes(request.status) && !request.expiredAt && (request.status !== "approved" || !!request.participants?.length) && <p className={s.waiverStatus}><span className={`${s.pendingStatus} ${request.participants?.length && request.participants.every(rider => rider.signedAt) ? s.signedStatus : ""}`}>{request.participants?.length && request.participants.every(rider => rider.signedAt) ? request.participants.length === 1 ? "Liability waiver signed" : "All liability waivers signed" : "Liability waiver signing pending"}</span></p>}</div>
      <div className={s.cardAction}><div className={s.estimateStatus}><strong>{rideMoney(request.estimate.totalAmount)}<small>{request.status === "approved" && request.participants?.length ? "Group total paid" : "Estimated total"}</small></strong>{["requested", "pending_payment"].includes(request.status) && !request.expiredAt && <span className={s.pendingStatus}>Payment pending</span>}</div><span><span className={s.closedLabel}>View full details</span><span className={s.openLabel}>Hide details</span><FiChevronDown aria-hidden="true" /></span></div>
      </summary>
      <div className={s.body}>
        <RideParticipantProgress request={request} />
        {request.draft.riders.map((rider, index) => {
          const items = request.estimate.items.filter(item => item.riderIndex === index && !item.coachId);
          const bundle = items.find(item => item.gearPackage);
          const included = items.filter(item => item.included);
          return <section key={index} className={s.rider}><h4>{rider.name} <span>({index === 0 ? "Customer" : "Buddy"})</span></h4><p className={s.contact}>{[rider.email, rider.phone].filter(Boolean).join(" · ")}</p>
            {items.filter(item => !item.gearPackage && !item.included).map((item, i) => <ReceiptItem key={item.productId || i} item={item} />)}
            {bundle && <div className={s.bundle}><ReceiptItem item={bundle} /><div className={s.included}>{included.map((item, i) => <ReceiptItem key={item.productId || i} item={item} />)}</div></div>}
            {!bundle && included.map((item, i) => <ReceiptItem key={item.productId || i} item={item} />)}
          </section>;
        })}
        {request.estimate.items.some(item => item.coachId) && <section className={s.rider}><h4>Coaching</h4>{request.estimate.items.filter(item => item.coachId).map(item => <ReceiptItem key={item.coachId} item={item} />)}</section>}
        <div className={s.total}><span>Estimated total</span><strong>{rideMoney(request.estimate.totalAmount)}</strong></div>
        <p className={s.payment}>{request.status === "approved" ? "Your ride is approved." : request.status === "pending_payment" ? "Each rider must sign their waiver and pay their individual total. Your group is approved once everyone completes both steps." : request.status === "requested" ? "After review, each rider will receive a personal link to sign their waiver and pay. No payment has been taken for this request." : "This request is closed."}</p>
        {request.draft.notes && <div className={s.note}><strong>Your note</strong><p>{request.draft.notes}</p></div>}
        {request.adminNote && <div className={s.note}><strong>Team note</strong><p>{request.adminNote}</p></div>}
      </div>
    </details>)}
  </section>;
}
