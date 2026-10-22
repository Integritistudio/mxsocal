import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import ContactDesign from "@/components/public-site/ContactDesign";
const font = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"] });
export const metadata: Metadata = { title: "Contact Us | MXSoCal", description: "Contact MXSoCal to plan your motocross ride, arrange gear and coaching, or book with buddies.", alternates: { canonical: "/contact-us" } };
export default function ContactPage() { return <div className={font.className}><ContactDesign /></div>; }
