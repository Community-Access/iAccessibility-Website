"use client";

import { ExternalLink, Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { BrandedMediaFrame } from "@/components/layout/branded-media-frame";
import type { DirectoryEntrySummary } from "@/lib/content/wordpress";

const PER_PAGE = 12;

type Props = {
  entries: DirectoryEntrySummary[];
  platformFacets: string[];
  categoryFacets: string[];
  initialQuery?: string;
  initialPlatforms?: string[];
  initialCategory?: string;
  initialPage?: number;
};

const linkClass =
  "inline-flex items-center gap-1 font-medium text-[#0f6cba] underline underline-offset-2 hover:text-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0066bf] rounded";

const pageLinkClass =
  "inline-flex min-w-[2.5rem] items-center justify-center gap-1 rounded-md border border-[#6b6b6b] px-3 py-2 text-sm font-medium text-[#222222] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0066bf]";
const pageCurrentClass =
  "inline-flex min-w-[2.5rem] items-center justify-center rounded-md bg-[#0066bf] px-3 py-2 text-sm font-semibold text-white";
const pageDisabledClass =
  "inline-flex items-center gap-1 rounded-md border border-[#d4d4d4] px-3 py-2 text-sm text-[#767676]";

export function DirectoryBrowser({
  entries,
  platformFacets,
  categoryFacets,
  initialQuery = "",
  initialPlatforms = [],
  initialCategory = "",
  initialPage = 1
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState(initialQuery);
  const [selectedPlatforms, setSelectedPlatforms] =
    useState<string[]>(initialPlatforms);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [page, setPage] = useState(initialPage);
  const [liveMessage, setLiveMessage] = useState("");

  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const didMountRef = useRef(false);
  const pageChangedByUserRef = useRef(false);

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (
        normalizedQuery &&
        !`${entry.appName} ${entry.description}`
          .toLowerCase()
          .includes(normalizedQuery)
      ) {
        return false;
      }
      if (
        selectedPlatforms.length > 0 &&
        !selectedPlatforms.some((platform) =>
          entry.platforms.includes(platform)
        )
      ) {
        return false;
      }
      if (selectedCategory && !entry.categories.includes(selectedCategory)) {
        return false;
      }
      return true;
    });
  }, [entries, normalizedQuery, selectedPlatforms, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice(
    (safePage - 1) * PER_PAGE,
    (safePage - 1) * PER_PAGE + PER_PAGE
  );

  // Keep the URL in sync so results are shareable and the back button works.
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    selectedPlatforms.forEach((platform) => params.append("platform", platform));
    if (selectedCategory) params.set("category", selectedCategory);
    if (safePage > 1) params.set("page", String(safePage));
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false
    });
  }, [query, selectedPlatforms, selectedCategory, safePage, pathname, router]);

  // Announce the result count (debounced so typing does not spam).
  useEffect(() => {
    const handle = setTimeout(() => {
      if (filtered.length === 0) {
        setLiveMessage("No apps found. Adjust your search or filters.");
      } else {
        setLiveMessage(
          `${filtered.length} ${filtered.length === 1 ? "app" : "apps"} found` +
            (totalPages > 1 ? `, page ${safePage} of ${totalPages}` : "")
        );
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [filtered.length, safePage, totalPages]);

  // After a user changes the page, move focus to the results heading so
  // keyboard and screen reader users land at the new results.
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (pageChangedByUserRef.current) {
      pageChangedByUserRef.current = false;
      resultsHeadingRef.current?.focus();
    }
  }, [safePage]);

  const goToPage = useCallback((next: number) => {
    pageChangedByUserRef.current = true;
    setPage(next);
  }, []);

  const togglePlatform = useCallback((platform: string) => {
    setPage(1);
    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((value) => value !== platform)
        : [...current, platform]
    );
  }, []);

  const clearAll = useCallback(() => {
    setQuery("");
    setSelectedPlatforms([]);
    setSelectedCategory("");
    setPage(1);
  }, []);

  const activeFilters = [
    ...selectedPlatforms.map((platform) => ({
      key: `platform:${platform}`,
      label: `Platform: ${platform}`,
      remove: () => togglePlatform(platform)
    })),
    ...(selectedCategory
      ? [
          {
            key: `category:${selectedCategory}`,
            label: `Category: ${selectedCategory}`,
            remove: () => {
              setPage(1);
              setSelectedCategory("");
            }
          }
        ]
      : []),
    ...(query.trim()
      ? [
          {
            key: "search",
            label: `Search: ${query.trim()}`,
            remove: () => {
              setPage(1);
              setQuery("");
            }
          }
        ]
      : [])
  ];

  const pageWindow = useMemo(() => {
    const windowSize = 2;
    const start = Math.max(1, safePage - windowSize);
    const end = Math.min(totalPages, safePage + windowSize);
    const list: number[] = [];
    for (let p = start; p <= end; p += 1) list.push(p);
    return list;
  }, [safePage, totalPages]);

  return (
    <div className="space-y-6">
      <p className="sr-only">
        <a href="#directory-results-heading">Skip to results</a>
      </p>

      <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
        <form
          role="search"
          method="get"
          action={pathname}
          onSubmit={(event) => event.preventDefault()}
          className="space-y-5 rounded-lg border border-border p-4"
          aria-label="Filter the app directory"
        >
          <div>
            <label
              htmlFor="directory-search"
              className="block text-sm font-medium"
            >
              Search apps by name
            </label>
            <div className="mt-1 flex">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-input px-2 text-muted-foreground">
                <Search className="h-4 w-4" aria-hidden="true" />
              </span>
              <input
                id="directory-search"
                name="q"
                type="search"
                value={query}
                autoComplete="off"
                onChange={(event) => {
                  setPage(1);
                  setQuery(event.target.value);
                }}
                className="w-full rounded-r-md border border-input px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0066bf]"
                placeholder="e.g. Voice Dream"
              />
            </div>
          </div>

          {platformFacets.length > 0 ? (
            <fieldset className="border-0 p-0">
              <legend className="text-sm font-medium">
                Filter by platform
              </legend>
              <ul className="mt-2 space-y-1">
                {platformFacets.map((platform) => (
                  <li key={platform}>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="platform"
                        value={platform}
                        checked={selectedPlatforms.includes(platform)}
                        onChange={() => togglePlatform(platform)}
                        className="h-4 w-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0066bf]"
                      />
                      {platform}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          ) : null}

          {categoryFacets.length > 0 ? (
            <div>
              <label
                htmlFor="directory-category"
                className="block text-sm font-medium"
              >
                Filter by category
              </label>
              <select
                id="directory-category"
                name="category"
                value={selectedCategory}
                onChange={(event) => {
                  setPage(1);
                  setSelectedCategory(event.target.value);
                }}
                className="mt-1 w-full rounded-md border border-input px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0066bf]"
              >
                <option value="">All categories</option>
                {categoryFacets.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {activeFilters.length > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="text-sm font-medium text-[#0f6cba] underline underline-offset-2 hover:text-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0066bf] rounded"
            >
              Clear all filters
            </button>
          ) : null}
        </form>

        <div>
          {activeFilters.length > 0 ? (
            <>
              <h3 className="sr-only">Active filters</h3>
              <ul className="mb-4 flex flex-wrap gap-2">
                {activeFilters.map((filter) => (
                  <li key={filter.key}>
                    <button
                      type="button"
                      onClick={filter.remove}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0066bf]"
                    >
                      {filter.label}
                      <X className="h-3 w-3" aria-hidden="true" />
                      <span className="sr-only">
                        {" "}
                        — remove this filter
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <h3
            id="directory-results-heading"
            ref={resultsHeadingRef}
            tabIndex={-1}
            className="text-xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0066bf] rounded"
          >
            {filtered.length} {filtered.length === 1 ? "app" : "apps"}
          </h3>

          <p role="status" aria-live="polite" className="sr-only">
            {liveMessage}
          </p>

          {filtered.length === 0 ? (
            <p className="mt-4 text-foreground">
              No apps match your search and filters. Try removing a filter or
              clearing your search.
            </p>
          ) : (
            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {visible.map((entry) => (
                <li key={entry.id}>
                  <article
                    aria-labelledby={`directory-app-${entry.id}`}
                    className="h-full overflow-hidden rounded-lg border border-border bg-white"
                  >
                    <BrandedMediaFrame
                      src={entry.iconUrl}
                      alt=""
                      decorative
                      className="aspect-[16/9]"
                      fallbackLabel="App Directory"
                    />
                    <div className="p-4">
                      <h4
                        id={`directory-app-${entry.id}`}
                        className="text-lg font-semibold"
                      >
                        {entry.appName}
                      </h4>
                      {entry.platforms.length > 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {entry.platforms.join(", ")}
                        </p>
                      ) : null}
                      {entry.description ? (
                        <p className="mt-2 text-sm">{entry.description}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        {entry.appStoreUrl ? (
                          <a
                            href={entry.appStoreUrl}
                            className={linkClass}
                            rel="noopener noreferrer"
                          >
                            App Store
                            <span className="sr-only"> for {entry.appName}</span>
                            <ExternalLink
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </a>
                        ) : null}
                        {entry.websiteUrl ? (
                          <a
                            href={entry.websiteUrl}
                            className={linkClass}
                            rel="noopener noreferrer"
                          >
                            Developer website
                            <span className="sr-only"> for {entry.appName}</span>
                            <ExternalLink
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 ? (
            <nav aria-label="App directory pages" className="mt-8">
              <ul className="flex flex-wrap items-center justify-center gap-2">
                <li>
                  {safePage > 1 ? (
                    <button
                      type="button"
                      onClick={() => goToPage(safePage - 1)}
                      className={pageLinkClass}
                    >
                      <span aria-hidden="true">&larr;</span> Previous
                      <span className="sr-only"> page</span>
                    </button>
                  ) : (
                    <span className={pageDisabledClass} aria-hidden="true">
                      <span>&larr;</span> Previous
                    </span>
                  )}
                </li>

                {pageWindow[0] > 1 ? (
                  <li aria-hidden="true" className="px-1 text-[#595959]">
                    &hellip;
                  </li>
                ) : null}

                {pageWindow.map((p) =>
                  p === safePage ? (
                    <li key={p}>
                      <span
                        className={pageCurrentClass}
                        aria-current="page"
                        aria-label={`Page ${p}, current page`}
                      >
                        {p}
                      </span>
                    </li>
                  ) : (
                    <li key={p}>
                      <button
                        type="button"
                        onClick={() => goToPage(p)}
                        className={pageLinkClass}
                        aria-label={`Go to page ${p}`}
                      >
                        {p}
                      </button>
                    </li>
                  )
                )}

                {pageWindow[pageWindow.length - 1] < totalPages ? (
                  <li aria-hidden="true" className="px-1 text-[#595959]">
                    &hellip;
                  </li>
                ) : null}

                <li>
                  {safePage < totalPages ? (
                    <button
                      type="button"
                      onClick={() => goToPage(safePage + 1)}
                      className={pageLinkClass}
                    >
                      Next<span className="sr-only"> page</span>{" "}
                      <span aria-hidden="true">&rarr;</span>
                    </button>
                  ) : (
                    <span className={pageDisabledClass} aria-hidden="true">
                      Next <span>&rarr;</span>
                    </span>
                  )}
                </li>
              </ul>
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}
