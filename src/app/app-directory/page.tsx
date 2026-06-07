import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DirectoryBrowser } from "@/components/directory/directory-browser";
import {
  deriveDirectoryFacets,
  getDirectoryEntries
} from "@/lib/content/wordpress";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "App Directory"
};

export default async function AppDirectoryPage({
  searchParams
}: {
  searchParams: Promise<{
    q?: string;
    platform?: string | string[];
    category?: string;
    page?: string;
  }>;
}) {
  const { q, platform, category, page } = await searchParams;
  const entries = await getDirectoryEntries();
  const facets = deriveDirectoryFacets(entries);

  const initialPlatforms = (
    Array.isArray(platform) ? platform : platform ? [platform] : []
  ).filter((value) => facets.platforms.includes(value));
  const initialPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);

  return (
    <div className="wp-container space-y-10">
      <section className="wp-article text-center">
        <h1 className="text-3xl font-bold">App Directory</h1>
        <p className="mx-auto mt-4 max-w-3xl text-lg">
          Find accessibility information for apps across popular platforms. New
          submissions enter a pending-review queue before publishing.
        </p>
        <div className="mt-5">
          <Button asChild>
            <Link href="/app-directory/submit">Submit App</Link>
          </Button>
        </div>
      </section>

      <section className="wp-article" aria-labelledby="directory-browse-heading">
        <h2 id="directory-browse-heading" className="sr-only">
          Browse apps
        </h2>
        {entries.length === 0 ? (
          <p className="text-foreground">
            No approved entries are in the directory yet. Once apps are approved
            they will appear here.
          </p>
        ) : (
          <DirectoryBrowser
            entries={entries}
            platformFacets={facets.platforms}
            categoryFacets={facets.categories}
            initialQuery={q ?? ""}
            initialPlatforms={initialPlatforms}
            initialCategory={
              category && facets.categories.includes(category) ? category : ""
            }
            initialPage={initialPage}
          />
        )}
      </section>

      <section
        className="wp-article text-center"
        aria-labelledby="directory-submit-heading"
      >
        <h2 id="directory-submit-heading" className="text-2xl font-semibold">
          Submit an app
        </h2>
        <p className="mx-auto mt-2 max-w-2xl">
          Know an accessible app we should review? Submissions enter a
          pending-review queue before publishing.
        </p>
        <div className="mt-4">
          <Button asChild>
            <Link href="/app-directory/submit">Submit App</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
