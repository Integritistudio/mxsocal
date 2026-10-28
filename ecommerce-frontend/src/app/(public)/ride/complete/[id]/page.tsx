import type { Metadata } from "next";
import RideParticipantCheckout from "@/components/public-site/RideParticipantCheckout";
export const metadata: Metadata = { title: "Complete your ride booking | MXSoCal", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RideParticipantCheckout id={id} />;
}
