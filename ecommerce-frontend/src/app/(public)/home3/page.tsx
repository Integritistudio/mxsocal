import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import HomeThreeDesign from "@/components/public-site/HomeThreeDesign";
const font = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
export const metadata: Metadata = { title: "First Light. Full Throttle. | MXSoCal", description: "A Southern California motocross day, start to finish—bikes, tracks, gear, and coaching shaped around your ride.", robots: { index: false } };
export default function Page() { return <div className={font.className}><HomeThreeDesign /></div>; }
