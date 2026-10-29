import type { Track, TrackAvailability } from "@/lib/tracks";
export type TrackResponse = { track: Track; availabilityMonths?: TrackAvailability[] };
export async function trackAdmin<T>(path = "", method = "GET", data?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/admin/tracks/admin${path}`, { method, signal, cache: "no-store", ...(data === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }) });
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Unable to update tracks.");
  return result;
}
