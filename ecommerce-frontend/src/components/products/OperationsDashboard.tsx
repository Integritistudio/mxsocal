/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FiCalendar, FiDollarSign, FiClock, FiCheckCircle, FiRefreshCw } from "react-icons/fi";
import { useUser } from "@/context/UserContext";
import { operations } from "@/services/operations";
import { adminError } from "@/services/product-admin";
import s from "./admin-products.module.css";
import o from "./ride-operations.module.css";
type Overview = {
  pendingRequests: number; requestedCents: number; pendingPaymentRequests: number; partiallyPaidRequests: number;
  revenue: number; rideRevenue: number; legacyRevenue: number; outstandingCents: number; paidRiders: number;
  unpaidRiders: number; waiversPending: number; approvedRequests: number; completedRides: number; upcomingGroups: number; todaysRides: number;
  products: { id: string; name: string; images: string[]; stockQuantity: number; status: string; available: boolean }[];
  coaches: number; pendingEmails: number; today: string; generatedAt: string;
  upcomingRequests: { id: string; startDate: string; endDate: string; trackName: string | null; riderCount: number; amountPaid: number; ownerName: string }[];
};
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const date = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
export default function OperationsDashboard() {
  const { hasPermission } = useUser();
  const [data, setData] = useState<Overview | null>(null); const [error, setError] = useState(""); const [revision, setRevision] = useState(0); const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    let active = true;
    void operations<Overview>("overview").then(result => { if (active) { setData(result); setError(""); setRefreshing(false); } }).catch(err => { if (active) { setError(adminError(err)); setRefreshing(false); } });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => {
    const refresh = () => { if (!document.hidden) setRevision(n => n + 1); };
    const timer = window.setInterval(refresh, 60000); document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  if (!data) return error ? <div className={s.panel}><p role="alert" className={s.error}>{error}</p><button className={s.button} onClick={() => setRevision(n => n + 1)}>Try again</button></div> : <div className={s.adminSkeleton} role="status" aria-label="Loading dashboard" />;
  const cards = [
    { label: "Collected payments · USD", value: money(data.revenue), hint: "Actual payments, including partially paid groups", icon: FiDollarSign },
    { label: "Awaiting collection · USD", value: money(data.outstandingCents / 100), hint: `${data.unpaidRiders} riders still need to pay after acceptance`, icon: FiClock },
    { label: "Requests needing review", value: data.pendingRequests, hint: `${money(data.requestedCents / 100)} in estimates · not revenue`, icon: FiClock },
    { label: "Groups awaiting payment", value: data.pendingPaymentRequests, hint: "Accepted requests still awaiting waivers or payment", icon: FiDollarSign },
    { label: "Partially paid groups", value: data.partiallyPaidRequests, hint: "Some riders have paid; the group is not confirmed yet", icon: FiCheckCircle },
    { label: "Upcoming confirmed groups", value: data.upcomingGroups, hint: "Every rider has signed and paid · one count per group", icon: FiCalendar },
  ];
  const attention = data.products.filter(product => product.stockQuantity === 0 || product.status !== "available" || !product.available);
  return <div className={o.workspace}><header className={o.pageHeader}><div><span className={o.eyebrow}>Payment & booking overview</span><h1>Ride operations</h1><p>Requests → acceptance → individual waivers & payments → confirmed ride</p></div><button className={o.outlineButton} disabled={refreshing} onClick={() => { setRefreshing(true); setRevision(n => n + 1); }}><FiRefreshCw />{refreshing ? "Refreshing…" : "Refresh"}</button></header>
    {error && <p role="alert" className={o.error}>{error} Showing the last successful update.</p>}
    <p className={o.analyticsTimestamp}>Updated {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" }).format(new Date(data.generatedAt))} Pacific · refreshes every minute</p>
    <div className={o.dashboardMetrics}>{cards.map(card => <div className={o.analyticsCard} key={card.label}><card.icon aria-hidden="true" /><span>{card.label}</span><strong>{card.value}</strong><small>{card.hint}</small></div>)}</div>
    <div className={o.analyticsNote}><strong>How these numbers work</strong><p>Collected payments are gross amounts received, before refunds, Stripe fees and other costs. Unpaid estimates and equipment reservation rows are excluded.</p><p>Ride payments: {money(data.rideRevenue)} · Previous rental payments: {money(data.legacyRevenue)}</p></div>
    <div className={o.operationsStrip}><span><strong>{data.todaysRides}</strong> confirmed groups riding today</span><span><strong>{data.waiversPending}</strong> waivers outstanding after acceptance</span><span><strong>{data.completedRides}</strong> confirmed groups finished</span><span><strong>{data.pendingEmails}</strong> emails queued</span></div>
    <div className={o.buttonRow}>{hasPermission("booking:view") && <Link className={o.primaryButton} href="/bookings">Review requests & track payments</Link>}{hasPermission("product:update") && <Link className={o.outlineButton} href="/products">Manage inventory</Link>}{hasPermission("coach:view") && <Link className={o.outlineButton} href="/dashboard/coaches">Manage coaches ({data.coaches})</Link>}</div>
    <div className={s.dashboardColumns}><section className={s.panel}><div className={s.header}><h2>Upcoming confirmed groups</h2>{hasPermission("booking:view") && <Link href="/bookings">View bookings</Link>}</div><p className={s.hint}>Includes rides already in progress. Each group appears once.</p>{data.upcomingRequests.map(row => <Link className={o.upcomingGroup} key={row.id} href="/bookings"><div><span className={o.badge} data-status="approved">Paid & waivers signed</span><h3>{row.trackName || "Track to be arranged"}</h3><p>{row.ownerName} · {row.riderCount} {row.riderCount === 1 ? "rider" : "riders"}</p><small>{date(row.startDate)} – {date(row.endDate)}</small></div><strong>{money(row.amountPaid)}</strong></Link>)}{!data.upcomingRequests.length && <p className={s.hint}>{hasPermission("booking:view") ? "No fully signed and paid upcoming groups yet. Accepted requests appear here once everyone completes both steps." : "Booking details require booking-view permission."}</p>}</section>
      <section className={s.panel}><h2>Inventory needing attention</h2><p className={s.hint}>Out of stock, unavailable or in maintenance.</p>{attention.map(product => <Link className={s.upcomingRow} key={product.id} href={`/dashboard/products/${product.id}`}>{product.images?.[0] && <img src={product.images[0]} alt={product.name} />}<div><strong>{product.name}</strong><span>{product.stockQuantity} in stock · {product.status}</span></div></Link>)}{!attention.length && <p className={s.hint}>{data.products.length ? "All inventory is active and in stock." : "No inventory has been added yet."}</p>}<p className={s.hint}>{data.products.length} listings · {data.products.reduce((sum, product) => sum + product.stockQuantity, 0)} total units</p></section></div>
  </div>;
}
