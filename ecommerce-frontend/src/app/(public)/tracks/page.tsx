import type { Metadata } from "next";
import TracksDesign from "@/components/public-site/TracksDesign";
import { getTracks } from "@/lib/tracks";
export const metadata: Metadata = { title: "Motocross Tracks | MXSoCal", description: "Explore Fox Raceway, Perris, Cahuilla Creek, Lake Elsinore and Barona Oaks. Find your next Southern California motocross track.", alternates: { canonical: "/tracks" } };
export default async function TracksPage() { return <TracksDesign tracks={await getTracks()} />; }
