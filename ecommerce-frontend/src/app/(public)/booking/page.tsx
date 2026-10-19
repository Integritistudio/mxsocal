import { Suspense } from "react";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import BookingSkeleton from "@/components/public-site/BookingSkeleton";
import BookingFlow from "@/components/public-site/BookingFlow";
const font = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
export const metadata: Metadata = { title: "Book Your Ride | MXSoCal", robots: { index: false } };
export default function Page() { return <div className={font.className}><Suspense fallback={<BookingSkeleton />}><BookingFlow /></Suspense></div>; }
