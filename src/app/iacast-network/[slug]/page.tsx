import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandedMediaFrame } from "@/components/layout/branded-media-frame";
import { dateLabel, getPodcastEpisodeBySlug } from "@/lib/content/wordpress";
import { demoteHeadings, durationSpoken, formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const episode = await getPodcastEpisodeBySlug(slug);
  if (!episode) return { title: "Episode not found" };
  return { title: `${episode.title} - iACast Network` };
}

export default async function EpisodePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const episode = await getPodcastEpisodeBySlug(slug);

  if (!episode) notFound();

  const duration = formatDuration(episode.durationSeconds);
  const spoken = durationSpoken(episode.durationSeconds);

  return (
    <article className="wp-container">
      <div className="wp-article">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link
                href="/iacast-network"
                className="font-medium text-[#0f6cba] underline underline-offset-2 hover:text-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0066bf] rounded"
              >
                iACast Network
              </Link>
            </li>
            <li aria-hidden="true" className="text-muted-foreground">
              &rsaquo;
            </li>
            <li aria-current="page" className="text-muted-foreground">
              {episode.title}
            </li>
          </ol>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl font-bold md:text-4xl">{episode.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {episode.date ? (
              <time dateTime={episode.date}>{dateLabel(episode.date)}</time>
            ) : null}
            {duration ? (
              <span>
                {episode.date ? " · " : ""}
                <span aria-hidden="true">{duration}</span>
                <span className="sr-only">{spoken}</span>
              </span>
            ) : null}
            {episode.episodeNo ? (
              <span> · Episode {episode.episodeNo}</span>
            ) : null}
          </p>
        </header>

        <BrandedMediaFrame
          src={episode.image}
          alt=""
          decorative
          className="mb-8 aspect-[16/9] max-h-[28rem] rounded-lg border border-border"
          fallbackLabel="iACast"
        />

        {episode.enclosureUrl ? (
          <div className="mb-8">
            <audio
              className="w-full"
              controls
              preload="none"
              src={episode.enclosureUrl}
              aria-label={`Audio player for ${episode.title}`}
            >
              <a href={episode.enclosureUrl}>
                Download audio for {episode.title}
              </a>
            </audio>
            <p className="mt-2 text-sm">
              <a
                href={episode.enclosureUrl}
                className="font-medium text-[#0f6cba] underline underline-offset-2 hover:text-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0066bf] rounded"
                download
              >
                Download
                <span className="sr-only"> {episode.title} (audio)</span>
              </a>
            </p>
          </div>
        ) : null}

        {episode.bodyHtml ? (
          <section aria-label="Show notes">
            <div
              className="wp-prose"
              dangerouslySetInnerHTML={{ __html: demoteHeadings(episode.bodyHtml) }}
            />
          </section>
        ) : null}
      </div>
    </article>
  );
}
