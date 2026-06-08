import type { Metadata } from "next";
import { AudioSubmissionForm } from "@/components/forms/audio-submission-form";
import { PodcastBrowser } from "@/components/podcast/podcast-browser";
import { getPodcastEpisodes } from "@/lib/content/wordpress";
import { PODCASTS_PUBLIC_ENABLED } from "@/lib/flags";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "iACast Network"
};

export default async function IACastPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const episodes = await getPodcastEpisodes();
  const initialPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);

  return (
    <div className="wp-container space-y-10">
      <section className="wp-article text-center">
        <h1 className="text-3xl font-bold">iACast Network</h1>
        <p className="mx-auto mt-4 max-w-3xl text-lg">
          The iACast Network brings accessibility news, Apple coverage, and
          conversations for blind and low-vision users. Episodes are returning
          soon on a new feed &mdash; submit your own audio content for media-team
          review below.
        </p>
      </section>

      <div className="wp-article">
        <h2 id="iacast-browse-heading" className="sr-only">
          Browse episodes
        </h2>
        {!PODCASTS_PUBLIC_ENABLED ? (
          <p className="text-foreground">
            Podcast episodes are temporarily unavailable while we move to a new
            feed. Check back soon.
          </p>
        ) : episodes.length === 0 ? (
          <p className="text-foreground">
            No episodes are available yet. Once episodes are published they will
            appear here.
          </p>
        ) : (
          <PodcastBrowser
            episodes={episodes}
            initialQuery={q ?? ""}
            initialPage={initialPage}
          />
        )}
      </div>

      <AudioSubmissionForm />
    </div>
  );
}
