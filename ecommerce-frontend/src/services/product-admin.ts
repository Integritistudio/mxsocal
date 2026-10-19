import { apiInstance, API_ENDPOINTS } from "@/config/api";
export async function productAdmin(path = "", method = "GET", data?: unknown) { return apiInstance(`${API_ENDPOINTS.PRODUCTS}${path}`, { method, ...(data !== undefined ? { data } : {}) }); }
export function adminError(error: unknown) { const failure = error as { response?: { data?: { message?: string } }; message?: string }; return failure.response?.data?.message || failure.message || "Something went wrong. Please try again."; }
