export type RideProduct = { id: string; name: string; category: string; group: string; images: string[]; pricePerDay: string | null; remaining: number; availableDates: string[]; sizes: string[]; currency: string };
export type RideCoach = { id: string; name: string; specialty: string; image: string; dailyRate: string };
export type RideTrack = { id: string; name: string; slug: string; city: string; images: string[] };
export type Rider = { name: string; email: string; phone: string; age?: string | number; heightCm?: string | number; weightKg?: string | number; bikeId: string; wantsGear?: boolean; coachId?: string | null; gear: { productId: string; size: string }[] };
export type RideDraft = { trackId: string | null; startDate: string; endDate: string; riders: Rider[]; coachId: string | null; coachMode?: "group" | "individual"; notes: string };
export type RideCatalog = { tracks: RideTrack[]; products: RideProduct[]; bikes: RideProduct[]; coaches: RideCoach[]; today: string; lastDate: string; dates: string[]; needsCoach: boolean; gearDailyAmount: number | null };
export type RideEstimate = { track: { id: string; name: string } | null; dates: string[]; items: { riderIndex?: number; riderName?: string; assignmentLabel?: string; included?: boolean; gearPackage?: boolean; productId?: string; coachId?: string; name: string; size?: string; image?: string; dailyAmount: number; days: number; amount: number }[]; coach: RideCoach | null; coaches?: (RideCoach & { assignmentLabel?: string })[]; totalAmount: number; currency: string; needsCoach: boolean };
export type RideRequest = { id: string; status: string; startDate: string; endDate: string; draft: RideDraft; estimate: RideEstimate; adminNote?: string; expiredAt?: string | null; createdAt: string; User?: { name: string; email: string; phone: string } };
export async function rideRequest<T>(path: string, method = "GET", data?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/ride-requests/${path}`, { method, signal, cache: "no-store", ...(data === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }) });
  const result = await response.json(); if (!response.ok) throw new Error(result.message || "Unable to process your ride request."); return result;
}
export const rideMoney = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export function buddyDetailsError(rider: Rider): string | null {
  if (!/^\d+(?:\.0+)?$/.test(String(rider.age ?? "").trim()) || Number(rider.age) < 1 || Number(rider.age) > 120) return "Enter a valid age between 1 and 120 years.";
  for (const [key, label, unit, min, max] of [["heightCm", "height", "cm", 30, 300], ["weightKg", "weight", "kg", 1, 500]] as const) {
    const value = rider[key];
    if (!/^\d+(?:\.\d)?0*$/.test(String(value ?? "").trim()) || Number(value) < min || Number(value) > max) return `Enter a valid ${label} between ${min} and ${max} ${unit}, using no more than one decimal place.`;
  }
  return null;
}
export function buddyDetailsValid(rider: Rider) {
  return buddyDetailsError(rider) === null;
}

export const rideRequestTabs = [
  { key: "all", label: "All" }, { key: "requested", label: "Awaiting approval" },
  { key: "approved", label: "Approved" }, { key: "rejected", label: "Rejected" },
  { key: "expired", label: "Expired" }, { key: "cancelled", label: "Cancelled" },
];
export function matchesRequestTab(request: RideRequest, tab: string) {
  if (tab === "all") return true;
  if (tab === "expired") return !!request.expiredAt;
  if (tab === "rejected") return request.status === "rejected" && !request.expiredAt;
  return request.status === tab;
}
