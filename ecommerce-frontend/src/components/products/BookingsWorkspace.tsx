"use client";
import { useState } from "react";
import { useUser } from "@/context/UserContext";
import { FiSliders, FiClipboard } from "react-icons/fi";
import RideRequestsList from "./RideRequestsList";
import RidePricingEditor from "./RidePricingEditor";
import s from "./ride-operations.module.css";
export default function BookingsWorkspace() {
  const [view, setView] = useState("requests");
  const { user } = useUser();
  return <div className={s.workspace}><header className={s.pageHeader}><div><span className={s.eyebrow}>Ride operations</span><h1>Bookings & requests</h1><p>Review new rides, follow payments, and prepare your next group.</p></div><span className={s.timezone}>Ride dates use Pacific time</span></header>
    <nav className={s.workspaceTabs} aria-label="Booking workspace">{[{ id: "requests", label: "Ride requests", icon: FiClipboard }, ...(user?.role === "admin" ? [{ id: "pricing", label: "Daily pricing", icon: FiSliders }] : [])].map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-pressed={view === id} onClick={() => setView(id)}><Icon aria-hidden="true" />{label}</button>)}</nav>
    {view === "requests" ? <RideRequestsList admin /> : <RidePricingEditor />}
  </div>;
}
