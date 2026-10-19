import { Suspense } from "react";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import BookingSuccess from "@/components/public-site/BookingSuccess";
const font = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
export const metadata: Metadata = { title: "Your Booking | MXSoCal", robots: { index: false } };
export default function Page() { return <div className={font.className}><Suspense fallback={<p role="status">Checking your payment…</p>}><BookingSuccess /></Suspense></div>; }
