export type RentalProduct = { id: string; stockQuantity: number; name: string; slug: string; category: string; images: string[]; pricePerDay: string | null; currency: string; attributes: { rentalGroup?: string; sizes?: string[]; variant?: number }; helmetSpec?: { sizes: string[] }; suitSpec?: { sizes: string[] } };
export type RentalCoach = { id: string; firstName: string; lastName: string; specialty: string; bio: string; hourlyRate: string; profileImage: string; imagePresentation?: { height: number; top: number } };
export type Slot = { start: string; end: string; available?: boolean; remaining?: number };
export type BookingDraft = { productId: string; quantity?: number; bookingDate: string; slots: Slot[]; accessories: { productId: string; size: string; quantity: number }[]; coachId?: string; notes?: string };
export type BookingQuote = { items: { productId?: string; coachId?: string; name: string; size?: string; unitAmount: number; quantity: number }[]; totalAmount: number; currency: string; durationHours: number };
export async function bookingRequest<T>(path: string, data?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/booking/${path}`, { cache: "no-store", signal, ...(data === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Unable to complete your booking.");
  return result;
}
