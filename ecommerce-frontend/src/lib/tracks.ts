import { cache } from "react";
export type Track = { id: string; slug: string; name: string; city: string; address: string; tagline: string; description: string; website: string; images: string[]; layouts: string[]; features: string[]; imageSource: string };
export type TrackAvailability = { month: string; timeZone: string; today: string; days: Partial<Record<string, { status: "available" | "unavailable"; note: string }>>; updatedAt: string | null };
const base = () => (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
export async function getTracks(): Promise<Track[] | null> {
  try { const response = await fetch(`${base()}/tracks`, { cache: "no-store", signal: AbortSignal.timeout(10000) }); return response.ok ? (await response.json()).tracks : null; } catch { return null; }
}
export const getTrack = cache(async (slug: string): Promise<{ status: number; track: Track | null; availability?: TrackAvailability; availabilityMonths?: TrackAvailability[] }> => {
  if (!/^[a-z0-9-]{1,180}$/.test(slug)) return { status: 404, track: null };
  try { const response = await fetch(`${base()}/tracks/${encodeURIComponent(slug)}`, { cache: "no-store", signal: AbortSignal.timeout(10000) }); return { status: response.status, ...(response.ok ? await response.json() : { track: null }) }; } catch { return { status: 503, track: null }; }
});
