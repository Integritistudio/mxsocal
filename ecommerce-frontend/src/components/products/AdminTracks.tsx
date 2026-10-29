/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FiArrowUpRight, FiEdit2, FiFlag, FiMapPin, FiPlus, FiRefreshCw, FiSearch, FiTrash2 } from "react-icons/fi";
import { useUser } from "@/context/UserContext";
import type { Track } from "@/lib/tracks";
import { trackAdmin } from "@/services/track-admin";
import s from "./admin-products.module.css";
import t from "./admin-tracks.module.css";
export default function AdminTracks() {
  const { hasPermission } = useUser(); const permitted = hasPermission("availability:manage");
  const [tracks, setTracks] = useState<Track[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [search, setSearch] = useState(""); const [revision, setRevision] = useState(0); const [confirm, setConfirm] = useState(""); const [deleting, setDeleting] = useState(""); const [message, setMessage] = useState("");
  useEffect(() => {
    if (!permitted) return;
    const controller = new AbortController(); setLoading(true); setError("");
    void trackAdmin<{ tracks: Track[] }>("", "GET", undefined, controller.signal).then(result => { setTracks(result.tracks); setLoading(false); }).catch(error => { if (!controller.signal.aborted) { setError(error.message); setLoading(false); } });
    return () => controller.abort();
  }, [revision, permitted]);
  async function remove(track: Track) {
    if (deleting) return;
    setDeleting(track.id); setError(""); setMessage("");
    try { await trackAdmin(`/${track.id}`, "DELETE"); setTracks(previous => previous.filter(row => row.id !== track.id)); setConfirm(""); setMessage(`${track.name} removed.`); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to remove the track."); }
    finally { setDeleting(""); }
  }
  if (!permitted) return <div className={s.panel}>Track management permission is required.</div>;
  const query = search.trim().toLowerCase();
  const visible = tracks.filter(track => [track.name, track.city, ...track.layouts].some(value => value.toLowerCase().includes(query)));
  return <div><header className={s.header}><div><span className={t.eyebrow}>THE RIDING DESTINATIONS</span><h1>Tracks</h1><p className={s.hint}>Manage track pages, photos, and ride-day availability.</p></div><Link className={s.button} href="/dashboard/tracks/new"><FiPlus /> Add track</Link></header>
    <div className={t.toolbar}><label className={t.search}><FiSearch /><input aria-label="Search tracks" placeholder="Search by name, city, or layout" value={search} onChange={event => setSearch(event.target.value)} /></label><span>{tracks.length} {tracks.length === 1 ? "track" : "tracks"}</span><button type="button" className={s.smallButton} disabled={loading || !!deleting} onClick={() => setRevision(value => value + 1)}><FiRefreshCw /> Refresh</button></div>
    {error && <p role="alert" className={s.error}>{error} <button type="button" onClick={() => setRevision(value => value + 1)}>Try again</button></p>}{message && <p role="status" className={s.success}>{message}</p>}
    {loading ? <div className={s.panel} role="status">Loading tracks…</div> : !visible.length ? <div className={`${s.panel} ${s.empty}`}><FiFlag size={32} /><h2>{tracks.length ? "No matching tracks" : "Your next destination starts here."}</h2><p className={s.hint}>{tracks.length ? "Try another name, city, or layout." : "Add your first track, upload its photos, and set the days riders can book."}</p>{tracks.length ? <button className={s.button} onClick={() => setSearch("")}>Clear search</button> : <Link className={s.button} href="/dashboard/tracks/new">Add your first track</Link>}</div> : <div className={t.grid}>{visible.map(track => <article key={track.id} className={t.card}><Link className={t.cover} href={`/dashboard/tracks/${track.id}`}>{track.images[0] ? <img src={track.images[0]} alt={track.name} /> : <FiFlag size={40} />}<span>{track.layouts.length} layouts</span></Link><div className={t.cardBody}><span className={t.city}><FiMapPin />{track.city}, California</span><h2><Link href={`/dashboard/tracks/${track.id}`}>{track.name}</Link></h2><p>{track.tagline || track.description}</p><div className={t.features}>{track.features.map((feature, index) => <span key={`${feature}-${index}`}>{feature}</span>)}</div><div className={t.cardActions}><Link href={`/dashboard/tracks/${track.id}`}><FiEdit2 /> Edit track</Link><Link href={`/tracks/${track.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${track.name} public page`}><FiArrowUpRight /></Link><button type="button" disabled={!!deleting} onClick={() => setConfirm(track.id)} aria-label={`Remove ${track.name}`}><FiTrash2 /></button></div>{confirm === track.id && <div className={t.confirm} role="group" aria-label={`Confirm removal of ${track.name}`}><strong>Remove {track.name}?</strong><p>This removes its public page and availability. Existing ride request records are retained.</p><div><button className={`${s.button} ${s.danger}`} disabled={!!deleting} onClick={() => void remove(track)}>{deleting === track.id ? "Removing…" : "Remove track"}</button><button className={`${s.button} ${s.secondary}`} disabled={!!deleting} onClick={() => setConfirm("")}>Cancel</button></div></div>}</div></article>)}</div>}
  </div>;
}
