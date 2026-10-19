import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import CoachesDesign from "@/components/public-site/CoachesDesign";
const font = DM_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "700"] });
export const metadata: Metadata = {
  title: "Motocross Coaches | MXSoCal",
  description: "Find your MXSoCal coach for motocross racing, off-road riding, freestyle, or your first dirt bike lesson.",
  alternates: { canonical: "/coaches" },
};
export default function CoachesPage() { return <div className={font.className}><CoachesDesign /></div>; }
