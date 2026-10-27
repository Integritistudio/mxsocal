import { getTracks } from "./tracks";

export type HomeBike = { id: string; slug: string; name: string; images: string[]; pricePerDay: string | null; currency: string; tagline: string | null; features: string[] };
export type HomeCoach = { id: string; firstName: string; lastName: string; profileImage: string | null; specialty: string | null; dailyRate: string | null };

async function collection<T>(path: string, key: string): Promise<T[] | null> {
  try {
    const base = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
    const response = await fetch(`${base}${path}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data[key]) ? data[key] : null;
  } catch { return null; }
}

export async function getHomeContent() {
  const [bikes, coaches, tracks] = await Promise.all([
    collection<HomeBike>("/products/bikes?page=1", "bikes"),
    collection<HomeCoach>("/coach/public?page=1", "coaches"),
    getTracks(),
  ]);
  return { bikes, coaches, tracks };
}
