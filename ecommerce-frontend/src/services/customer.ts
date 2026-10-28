export type Customer = { id: string; name: string; firstName?: string; lastName?: string; email: string; role: string; needsCoach: boolean; phone?: string; dateOfBirth?: string; heightCm?: string | number | null; weightKg?: string | number | null; gender?: string; genderDescription?: string; address?: string; city?: string; state?: string; zipCode?: string; country?: string; profileImage?: string; emailVerifiedAt?: string; createdAt?: string; permissions?: string[] };
export async function customerRequest(path: string, method = "GET", data?: unknown) {
  const response = await fetch(`/api/customer/${path}`, { method, cache: "no-store", ...(data instanceof FormData ? { body: data } : data !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) } : {}) });
  const result = await response.json(); if (!response.ok) throw new Error(result.message || "Please try again."); return result;
}
