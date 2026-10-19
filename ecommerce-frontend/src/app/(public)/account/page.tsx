import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import CustomerAccount from "@/components/public-site/CustomerAccount";
const font = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"] });
export const metadata: Metadata = { title: "My Account | MXSoCal", robots: { index: false } };
export default function Page() { return <div className={font.className}><CustomerAccount /></div>; }
