import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandedMediaFrame } from "@/components/layout/branded-media-frame";
import { SITE_FALLBACK_IMAGE_URL } from "@/lib/branding";
import { dateLabel, getPodcastEpisodeBySlug } from "@/lib/content/wordpress";
import {
  durationSpoken,
  formatDuration,
  normalizeEmbeddedHeadings,
  stripHtml
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const episode = await getPodcastEpisodeBySlug(slug);
  if (!episode) return { title: "Episode not found" };
  const title = `${episode.title} - iACast Network`;
  const description =
    stripHtml(episode.bodyHtml).slice(0, 220) ||
    "Listen to the iACast Network archive from iAccessibility.";
  const imageUrl = episode.image || SITE_FALLBACK_IMAGE_URL;
  const imageAlt = episode.image
    ? `${episode.title} episode artwork`
    : "iAccessibility logo";

  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      url: `/iacast-network/${episode.slug}`,
      publishedTime: episode.date ?? undefined,
      images: [
        {
          url: imageUrl,
          alt: imageAlt
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: imageUrl, alt: imageAlt }]
    }
  };
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
          <div>
            <div
              className="wp-prose"
              dangerouslySetInnerHTML={{
                __html: normalizeEmbeddedHeadings(episode.bodyHtml)
              }}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
