"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { rideRequest, type RideRequest } from "@/services/ride-requests";
import AdminRideRequests from "./AdminRideRequests";
import RideRequestReceipts from "../public-site/RideRequestReceipts";
export default function RideRequestsList({ admin = false }: { admin?: boolean }) {
  const { hasPermission } = useUser();
  const [requests, setRequests] = useState<RideRequest[]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [revision, setRevision] = useState(0); const [busy, setBusy] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void rideRequest<{ requests: RideRequest[] }>(admin ? "admin" : "mine", "GET", undefined, controller.signal).then(data => { setRequests(data.requests); setLoading(false); setError(""); }).catch(err => { if (!controller.signal.aborted) { setError(err.message); setLoading(false); } });
    return () => controller.abort();
  }, [admin, revision]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (!document.hidden) setRevision(value => value + 1); }, 60000);
    return () => window.clearInterval(timer);
  }, []);
  async function review(id: string, status: string, note: string) {
    if (busy) return false; setBusy(id); setError("");
    try { const result = await rideRequest<{ request: RideRequest }>(`admin/${id}`, "PATCH", { status, note }); setRequests(previous => previous.map(row => row.id === id ? { ...row, ...result.request } : row)); return true; }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to review this request."); return false; }
    finally { setBusy(""); }
  }
  if (!admin) return <RideRequestReceipts requests={requests} loading={loading} error={error} onRefresh={() => { setLoading(true); setRevision(n => n + 1); }} />;
  return <AdminRideRequests requests={requests} loading={loading} error={error} busy={busy} canReview={hasPermission("booking:update")} onRefresh={() => { setLoading(true); setRevision(n => n + 1); }} onReview={review} />;
}
