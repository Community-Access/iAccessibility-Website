import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { podcastEpisodes, podcastShows } from "@/db/schema";
import { canAdmin, getCurrentAppUser } from "@/lib/auth/server";
import { PodcastsTable, type EpisodeRow } from "./podcasts-table";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Podcasts"
};

export default async function AdminPodcastsPage() {
  const user = await getCurrentAppUser();
  if (!canAdmin(user?.role)) redirect("/admin");

  const rows: EpisodeRow[] =
    hasDatabase && db
      ? await db
          .select({
            id: podcastEpisodes.id,
            title: podcastEpisodes.title,
            showTitle: podcastShows.title,
            pubDate: podcastEpisodes.pubDate,
            enclosureUrl: podcastEpisodes.enclosureUrl
          })
          .from(podcastEpisodes)
          .innerJoin(podcastShows, eq(podcastEpisodes.showId, podcastShows.id))
          .orderBy(desc(podcastEpisodes.pubDate))
          .limit(1000)
      : [];

  return (
    <div className="space-y-8">
      <div className="wp-article">
        <h1 className="text-3xl font-bold">Podcasts</h1>
        <p className="mt-3 text-[#595959]">
          {rows.length.toLocaleString()} imported episode
          {rows.length === 1 ? "" : "s"}. Search and browse the catalogue below.
        </p>
      </div>

      <div className="wp-article">
        <h2 className="mb-4 text-2xl font-semibold">All episodes</h2>
        <PodcastsTable rows={rows} />
      </div>
    </div>
  );
}
