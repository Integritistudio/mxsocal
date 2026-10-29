"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { FiArrowLeft, FiArrowUpRight, FiSave } from "react-icons/fi";
import { useUser } from "@/context/UserContext";
import type { Track, TrackAvailability } from "@/lib/tracks";
import { trackAdmin, type TrackResponse } from "@/services/track-admin";
import ImagePicker from "./ImagePicker";
import TrackAvailabilityEditor from "./TrackAvailabilityEditor";
import s from "./admin-products.module.css";
import t from "./admin-tracks.module.css";
const blank: Track = { id: "", slug: "", name: "", city: "", address: "", tagline: "", description: "", website: "", images: [], layouts: [], features: [], imageSource: "", displayOrder: 0 };
const lines = (value: string) => value.split("\n").map(line => line.trim()).filter(Boolean);
export default function AdminTrackEditor({ id }: { id: string }) {
  const { hasPermission } = useUser(); const permitted = hasPermission("availability:manage"); const router = useRouter();
  const [track, setTrack] = useState<Track>(blank); const [months, setMonths] = useState<TrackAvailability[]>([]); const [loading, setLoading] = useState(id !== "new");
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false); const [uploads, setUploads] = useState(0); const [revision, setRevision] = useState(0);
  const [layouts, setLayouts] = useState(""); const [features, setFeatures] = useState("");
  useEffect(() => {
    if (!permitted || id === "new") return;
    const controller = new AbortController(); setLoading(true); setError("");
    void trackAdmin<TrackResponse>(`/${id}`, "GET", undefined, controller.signal).then(result => { setTrack(result.track); setMonths(result.availabilityMonths || []); setLayouts(result.track.layouts.join("\n")); setFeatures(result.track.features.join("\n")); setLoading(false); }).catch(error => { if (!controller.signal.aborted) { setError(error.message); setLoading(false); } });
    return () => controller.abort();
  }, [id, permitted, revision]);
  const update = (key: keyof Track, value: unknown) => setTrack(previous => ({ ...previous, [key]: value }));
  async function save(event: FormEvent) {
    event.preventDefault(); if (saving || uploads) return; setSaving(true); setError(""); setMessage("");
    try {
      const result = await trackAdmin<TrackResponse>(track.id ? `/${track.id}` : "", track.id ? "PUT" : "POST", { ...track, layouts: lines(layouts), features: lines(features) });
      setTrack(result.track); setMessage("Track saved. The public page and booking catalog now use these details.");
      if (id === "new") router.replace(`/dashboard/tracks/${result.track.id}`);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save track."); }
    finally { setSaving(false); }
  }
  if (!permitted) return <div className={s.panel}>Track management permission is required.</div>;
  if (loading) return <div className={s.panel} role="status">Loading track…</div>;
  if (id !== "new" && !track.id) return <div className={s.panel}><p className={s.error} role="alert">{error || "Track not found."}</p><button className={s.button} onClick={() => setRevision(value => value + 1)}>Try again</button><Link className={`${s.button} ${s.secondary}`} href="/dashboard/tracks">Back to tracks</Link></div>;
  return <div className={t.editor}><section className={s.panel}><header className={s.header}><div><span className={t.eyebrow}>TRACK DETAILS</span><h1>{track.id ? `Edit ${track.name}` : "Add track"}</h1><p className={s.hint}>Build the track page riders will see on the website.</p></div><Link className={s.button} href="/dashboard/tracks"><FiArrowLeft /> Back to tracks</Link></header><form onSubmit={save}><fieldset disabled={saving} className={t.fieldset}><div className={s.grid}>
    <label className={s.field}>Track name<input required maxLength={200} value={track.name} onChange={event => update("name", event.target.value)} /></label>
    <label className={s.field}>URL name<input maxLength={180} placeholder="Generated from the track name" pattern="[a-z0-9-]*" value={track.slug} onChange={event => update("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} /><small className={s.hint}>Example: fox-raceway</small></label>
    <label className={s.field}>City<input required maxLength={255} value={track.city} onChange={event => update("city", event.target.value)} /></label>
    <label className={s.field}>Full address<input required maxLength={255} value={track.address} onChange={event => update("address", event.target.value)} /><small className={s.hint}>Used for directions and the map on the public page.</small></label>
    <label className={`${s.field} ${s.full}`}>Tagline<input maxLength={500} value={track.tagline} onChange={event => update("tagline", event.target.value)} /></label>
    <label className={`${s.field} ${s.full}`}>Description<textarea required maxLength={15000} value={track.description} onChange={event => update("description", event.target.value)} style={{ minHeight: 180 }} /></label>
    <label className={s.field}>Official website (optional)<input type="url" maxLength={2000} placeholder="https://" value={track.website} onChange={event => update("website", event.target.value)} /></label>
    <label className={s.field}>Display order<input type="number" required min={0} max={10000} step={1} value={track.displayOrder ?? 0} onChange={event => update("displayOrder", Number(event.target.value))} /><small className={s.hint}>Lower numbers appear first.</small></label>
    <label className={s.field}>Track layouts (one per line)<textarea value={layouts} onChange={event => setLayouts(event.target.value)} placeholder={"Main track\nVet track\nMini track"} /><small className={s.hint}>Up to 12 layouts.</small></label>
    <label className={s.field}>Listing features (one per line, up to 3)<textarea value={features} onChange={event => setFeatures(event.target.value)} placeholder={"Multiple track layouts\nAll skill levels\nOn-site facilities"} /></label>
    </div><div className={s.section}><h2>Track photos</h2><p className={s.hint}>Add a cover and gallery images. Reorder photos to control their display on the public page.</p><ImagePicker label="Track gallery" uploadUrl="/api/admin/tracks/admin/photo" images={track.images} onChange={images => update("images", images)} onBusyChange={busy => setUploads(value => value + (busy ? 1 : -1))} /><label className={s.field}>Photo credits (optional)<input maxLength={255} value={track.imageSource} onChange={event => update("imageSource", event.target.value)} /></label></div>
    {error && <p role="alert" className={s.error}>{error}</p>}{message && <p role="status" className={s.success}>{message}</p>}<div className={s.productSaveBar}><button className={s.button} type="submit" disabled={saving || uploads > 0}><FiSave />{saving ? "Saving…" : "Save track"}</button>{track.id && <Link className={`${s.button} ${s.secondary}`} href={`/tracks/${track.slug}`} target="_blank" rel="noopener noreferrer">View public page <FiArrowUpRight /></Link>}<Link className={`${s.button} ${s.secondary}`} href="/dashboard/tracks">Back to tracks</Link></div></fieldset></form></section>
    {track.id && months.length > 0 ? <TrackAvailabilityEditor key={`${track.id}-${track.slug}`} calendars={[{ track, availabilityMonths: months }]} /> : !track.id && <div className={t.availabilityHint}>Save your track first, then set its available ride days. Dates are unavailable until you open them in the calendar.</div>}
    </div>;
}
