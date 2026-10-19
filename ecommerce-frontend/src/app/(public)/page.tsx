import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import HomeDesign from "@/components/public-site/HomeDesign";
import { getStories } from "@/lib/stories";

const font = DM_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "MXSoCal | Rentals and Experience",
  description: "Your paddock pass to pro-level motocross. Elite dirt bike rentals, coaching, and trackside support in Southern California.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const data = await getStories({ page: "1" });
  return <div className={font.className}><HomeDesign stories={data?.stories?.slice(0, 3) || []} /></div>;
}
