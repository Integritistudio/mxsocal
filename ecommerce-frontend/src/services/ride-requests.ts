export type RideProduct = { id: string; name: string; category: string; group: string; images: string[]; pricePerDay: string | null; remaining: number; availableDates: string[]; sizes: string[]; currency: string };
export type RideCoach = { id: string; name: string; specialty: string; image: string; dailyRate: string };
export type RideTrack = { id: string; name: string; slug: string; city: string; images: string[] };
export type Rider = { name: string; email: string; phone: string; bikeId: string; wantsGear?: boolean; gear: { productId: string; size: string }[] };
export type RideDraft = { trackId: string | null; startDate: string; endDate: string; riders: Rider[]; coachId: string | null; notes: string };
export type RideCatalog = { tracks: RideTrack[]; products: RideProduct[]; bikes: RideProduct[]; coaches: RideCoach[]; today: string; lastDate: string; dates: string[]; needsCoach: boolean; gearDailyAmount: number | null };
export type RideEstimate = { track: { id: string; name: string } | null; dates: string[]; items: { riderIndex?: number; riderName?: string; included?: boolean; gearPackage?: boolean; productId?: string; coachId?: string; name: string; size?: string; image?: string; dailyAmount: number; days: number; amount: number }[]; coach: RideCoach | null; totalAmount: number; currency: string; needsCoach: boolean };
export type RideRequest = { id: string; status: string; startDate: string; endDate: string; draft: RideDraft; estimate: RideEstimate; adminNote?: string; createdAt: string; User?: { name: string; email: string; phone: string } };
export async function rideRequest<T>(path: string, method = "GET", data?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/ride-requests/${path}`, { method, signal, cache: "no-store", ...(data === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }) });
  const result = await response.json(); if (!response.ok) throw new Error(result.message || "Unable to process your ride request."); return result;
}
export const rideMoney = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
