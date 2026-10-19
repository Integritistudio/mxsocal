import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import BikesDesign from "@/components/public-site/BikesDesign";
const font = DM_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "700"] });
export const metadata: Metadata = {
  title: "Dirt Bike Rentals | MXSoCal",
  description: "Find your next ride. Explore MXSoCal dirt bikes and filter by brand, engine size, and daily rental budget.",
  alternates: { canonical: "/bikes" },
};
export default async function BikesPage({ searchParams }: { searchParams: Promise<{ search?: string | string[] }> }) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search.trim().slice(0, 100) : "";
  return <div className={font.className}><BikesDesign key={search} initialSearch={search} /></div>;
}
