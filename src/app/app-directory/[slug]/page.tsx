import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandedMediaFrame } from "@/components/layout/branded-media-frame";
import { DirectoryComments } from "@/components/directory/directory-comments";
import { Button } from "@/components/ui/button";
import {
  directoryAccessibilityRatingLabel,
  getDirectoryEntryBySlug
} from "@/lib/content/wordpress";
import { getCurrentAppUser } from "@/lib/auth/server";
import { getDirectoryComments } from "@/lib/directory-comments";
import { normalizeEmbeddedHeadings } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getDirectoryEntryBySlug(slug);
  if (!entry) return { title: "App not found" };

  return {
    title: entry.appName,
    description:
      entry.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 160) ||
      `Accessibility information for ${entry.appName}.`
  };
}

export default async function DirectoryEntryPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [entry, user] = await Promise.all([
    getDirectoryEntryBySlug(slug),
    getCurrentAppUser()
  ]);

  if (!entry) notFound();

  const comments = await getDirectoryComments(entry.id);

  return (
    <div className="wp-container space-y-8">
      <article className="wp-article">
        <Link
          href="/app-directory"
          className="text-sm font-semibold text-[#0f6cba] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Back to App Directory
        </Link>

        <div className="mt-5 grid gap-6 lg:grid-cols-[14rem_1fr]">
          <BrandedMediaFrame
            src={entry.iconUrl}
            alt=""
            decorative
            className="aspect-square rounded-lg border border-[#767676]"
            fallbackLabel="App Directory"
          />
          <div>
            <h1 className="text-3xl font-bold">{entry.appName}</h1>
            {entry.platforms.length > 0 || entry.categories.length > 0 ? (
              <p className="mt-3 text-sm font-medium text-[#595959]">
                {[...entry.platforms, ...entry.categories].join(" · ")}
              </p>
            ) : null}
            {entry.accessibilityRating ? (
              <p className="mt-3 font-semibold text-[#222222]">
                Accessibility rating:{" "}
                {directoryAccessibilityRatingLabel(entry.accessibilityRating)}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              {entry.appStoreUrl ? (
                <Button asChild>
                  <a
                    href={entry.appStoreUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Open App Store
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </Button>
              ) : null}
              {entry.websiteUrl ? (
                <Button asChild variant="secondary">
                  <a
                    href={entry.websiteUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Open website
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {entry.description ? (
          <div
            className="wp-prose mt-8"
            dangerouslySetInnerHTML={{
              __html: normalizeEmbeddedHeadings(entry.description)
            }}
          />
        ) : null}
      </article>

      <DirectoryComments
        entryId={entry.id}
        comments={comments}
        isSignedIn={Boolean(user)}
      />
    </div>
  );
}
