import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import HomeDesign from "@/components/public-site/HomeDesign";
import { getStories } from "@/lib/stories";

const font = DM_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "MXSoCal | Motocross Riding Experiences",
  description: "Plan your motocross ride in Southern California. Choose your bike, bring your buddies, and add a track, gear, and coaching.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const data = await getStories({ page: "1" });
  return <div className={font.className}><HomeDesign stories={data?.stories?.slice(0, 3) || []} /></div>;
}
