import { cache } from "react";
import type { ProductResult } from "@/components/public-site/product-types";
export const getPublicProduct = cache(async (slug: string): Promise<{ status: number; data: ProductResult | null }> => {
  if (!/^[a-z0-9-]{1,200}$/i.test(slug)) return { status: 404, data: null };
  try {
    const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const response = await fetch(`${base.replace(/\/$/, "")}/products/${encodeURIComponent(slug)}/detail`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    return { status: response.status, data: response.ok ? await response.json() : null };
  } catch { return { status: 503, data: null }; }
});
