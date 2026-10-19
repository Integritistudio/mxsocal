import { Suspense } from "react";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import CustomerAuth from "@/components/public-site/CustomerAuth";
const font = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"] });
export const metadata: Metadata = { title: "Create Account | MXSoCal", robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; token?: string }> }) { const params = await searchParams; return <div className={font.className}><Suspense><CustomerAuth nextPath={typeof params.next === "string" ? params.next : "/account"} resetToken={typeof params.token === "string" ? params.token : ""} mode="signup" /></Suspense></div>; }
