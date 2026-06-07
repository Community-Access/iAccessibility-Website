import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DIRECTORY_CATEGORIES, DIRECTORY_PLATFORMS, getDirectoryEntries } from "@/lib/content/wordpress";

export const dynamic = "force-dynamic";

export default async function AppDirectoryPage() {
  const entries = await getDirectoryEntries();

  return (
    <div className="wp-container space-y-8">
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

      <section className="wp-article" aria-labelledby="directory-platforms-heading">
        <h2 id="directory-platforms-heading" className="text-2xl font-semibold">
          Platforms
        </h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          {DIRECTORY_PLATFORMS.map((platform) => (
            <li key={platform} className="rounded-md border border-border px-3 py-2">
              {platform}
            </li>
          ))}
        </ul>
      </section>

      <section className="wp-article" aria-labelledby="directory-categories-heading">
        <h2 id="directory-categories-heading" className="text-2xl font-semibold">
          Categories
        </h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {DIRECTORY_CATEGORIES.map((category) => (
            <li key={category} className="rounded-md border border-border px-3 py-2">
              {category}
            </li>
          ))}
        </ul>
      </section>

      <section className="wp-article" aria-labelledby="directory-entries-heading">
        <h2 id="directory-entries-heading" className="text-2xl font-semibold">
          Approved Apps
        </h2>
        {entries.length === 0 ? (
          <p className="mt-4 text-muted-foreground">
            No approved entries are in Neon yet. WordPress app-directory
            submissions have been exported and are ready for import once the
            schema gaps are approved.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {entries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-lg border border-border p-4"
              >
                <h3 className="text-lg font-semibold">{entry.appName}</h3>
                {entry.description ? <p className="mt-2">{entry.description}</p> : null}
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  {entry.appStoreUrl ? (
                    <a href={entry.appStoreUrl} className="inline-flex items-center gap-1">
                      App Store
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  ) : null}
                  {entry.websiteUrl ? (
                    <a href={entry.websiteUrl} className="inline-flex items-center gap-1">
                      Developer website
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
