import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TrackDetail from "@/components/public-site/TrackDetail";
import { getTrack } from "@/lib/tracks";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const { track } = await getTrack(slug);
  return track ? { title: `${track.name} | MXSoCal Tracks`, description: track.tagline, alternates: { canonical: `/tracks/${track.slug}` }, openGraph: { images: track.images } } : { title: "Track unavailable | MXSoCal" };
}
export default async function TrackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const result = await getTrack(slug);
  if (result.status === 404) notFound();
  if (!result.track) throw new Error("Track is temporarily unavailable. Please try again.");
  return <TrackDetail track={result.track} availabilityMonths={result.availabilityMonths} />;
}
