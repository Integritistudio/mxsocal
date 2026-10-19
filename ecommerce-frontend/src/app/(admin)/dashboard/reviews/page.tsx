import { Suspense } from "react";
import AdminReviews from "@/components/products/AdminReviews";
export default function Page() { return <Suspense fallback={<p>Loading reviews…</p>}><AdminReviews /></Suspense>; }
