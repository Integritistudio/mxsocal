import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import HomeVariant from "@/components/public-site/HomeVariant";
const font = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
export const metadata: Metadata = { title: "Ride More. Worry Less. | MXSoCal", description: "Discover motocross in Southern California. Choose your bike and plan a ride with your buddies, gear, and expert coaching.", robots: { index: false } };
export default function Page() { return <div className={font.className}><HomeVariant variant={2} /></div>; }
