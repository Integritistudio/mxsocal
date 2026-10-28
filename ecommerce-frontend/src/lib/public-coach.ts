import { cache } from "react";

export type PublicCoach = {
  id: string; firstName: string; lastName: string; bio: string | null;
  profileImage: string | null; specialty: string | null; experience: number | null;
  experienceLabel: string | null; skills: string[]; coachingLevels: string[];
  dailyRate: string | null; imagePresentation: { height: number; top: number } | null;
};

export const getPublicCoach = cache(async (id: string): Promise<{ status: number; coach: PublicCoach | null }> => {
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)) return { status: 404, coach: null };
  try {
    const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const response = await fetch(`${base.replace(/\/$/, "")}/coach/public/${encodeURIComponent(id)}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    return { status: response.status, coach: response.ok ? (await response.json()).coach : null };
  } catch { return { status: 503, coach: null }; }
});
