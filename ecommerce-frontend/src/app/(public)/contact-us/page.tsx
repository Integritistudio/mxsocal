import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import ContactDesign from "@/components/public-site/ContactDesign";
const font = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"] });
export const metadata: Metadata = { title: "Contact Us | MXSoCal", description: "Get in touch with MXSoCal for rentals and training programs.", alternates: { canonical: "/contact-us" } };
export default function ContactPage() { return <div className={font.className}><ContactDesign /></div>; }
