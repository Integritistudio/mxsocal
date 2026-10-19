import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import AboutDesign from "@/components/public-site/AboutDesign";

const font = DM_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });
export const metadata: Metadata = {
  title: "About Us | MXSoCal",
  description: "Discover the passion, craftsmanship, and rider community behind MXSoCal.",
  alternates: { canonical: "/about-us" },
};
export default function AboutPage() {
  return <div className={font.className}><AboutDesign /></div>;
}
