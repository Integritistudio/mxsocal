import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import HomeOneDesign from "@/components/public-site/HomeOneDesign";
const font = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
export const metadata: Metadata = { title: "Plan Your Next Ride | MXSoCal", description: "Build your Southern California motocross experience with bikes, buddies, tracks, gear, and coaching.", robots: { index: false } };
export default function Page() { return <div className={font.className}><HomeOneDesign /></div>; }
