import { getTracks, getTrack } from "@/lib/tracks";
import TrackAvailabilityEditor from "@/components/products/TrackAvailabilityEditor";
export default async function Page() {
  const tracks = await getTracks();
  if (!tracks) return <p>Unable to load tracks. Please refresh to try again.</p>;
  const calendars = await Promise.all(tracks.map(async track => ({ track, availabilityMonths: (await getTrack(track.slug)).availabilityMonths })));
  return <TrackAvailabilityEditor calendars={calendars} />;
}
