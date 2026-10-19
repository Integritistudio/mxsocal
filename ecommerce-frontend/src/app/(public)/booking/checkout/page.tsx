import { Suspense } from "react";
import { DM_Sans } from "next/font/google";
import EmbeddedBookingCheckout from "@/components/public-site/EmbeddedBookingCheckout";
import BookingSkeleton from "@/components/public-site/BookingSkeleton";
const font = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
export default function Page() { return <div className={font.className}><Suspense fallback={<BookingSkeleton />}><EmbeddedBookingCheckout /></Suspense></div>; }
