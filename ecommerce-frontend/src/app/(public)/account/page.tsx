import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import CustomerAccount from "@/components/public-site/CustomerAccount";
const font = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"] });
export const metadata: Metadata = { title: "My Account | MXSoCal", robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const tab = typeof params.tab === "string" && ["profile", "bookings", "saved", "reviews"].includes(params.tab) ? params.tab : "profile";
  return <div className={font.className}><CustomerAccount key={tab} initialTab={tab} /></div>;
}
