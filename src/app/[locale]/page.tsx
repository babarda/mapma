import ExploreClient from "@/components/explore/ExploreClient";
import { listVerifiedPhotos } from "@/lib/db";

// The map IS the homepage. Reads verified photos from the database
// (Supabase when configured, otherwise seed data + locally published photos).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const photos = await listVerifiedPhotos();
  return <ExploreClient photos={photos} />;
}
