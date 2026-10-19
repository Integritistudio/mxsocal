import { cache } from "react";
import type { Story, StoryListing } from "@/components/stories/types";
const base = () => (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
export const siteUrl = () => (process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export async function getStories(params: { q?: string; category?: string; page?: string } = {}): Promise<StoryListing | null> {
  try { const query = new URLSearchParams(); for (const [key, value] of Object.entries(params)) if (value) query.set(key, value); const response = await fetch(`${base()}/stories?${query}`, { cache: "no-store", signal: AbortSignal.timeout(10000) }); return response.ok ? response.json() : null; } catch { return null; }
}
export const getStory = cache(async (slug: string): Promise<{ status: number; data: { story: Story; related: Story[] } | null }> => {
  if (!/^[a-z0-9-]{1,180}$/.test(slug)) return { status: 404, data: null };
  try { const response = await fetch(`${base()}/stories/${encodeURIComponent(slug)}`, { cache: "no-store", signal: AbortSignal.timeout(10000) }); return { status: response.status, data: response.ok ? await response.json() : null }; } catch { return { status: 503, data: null }; }
});
export async function storySitemap(): Promise<{ slug: string; updatedAt: string }[]> { const response = await fetch(`${base()}/stories/sitemap`, { cache: "no-store", signal: AbortSignal.timeout(10000) }); if (!response.ok) throw new Error("Stories sitemap unavailable"); return response.json(); }
