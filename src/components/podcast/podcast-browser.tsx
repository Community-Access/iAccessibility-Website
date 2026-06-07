"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandedMediaFrame } from "@/components/layout/branded-media-frame";
import type { PodcastEpisodeSummary } from "@/lib/content/wordpress";
import { durationSpoken, formatDate, formatDuration } from "@/lib/utils";

const PER_PAGE = 12;

type Props = {
  episodes: PodcastEpisodeSummary[];
  initialQuery?: string;
  initialPage?: number;
};

const linkClass =
  "font-medium text-[#0f6cba] underline underline-offset-2 hover:text-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0066bf] rounded";
const pageLinkClass =
  "inline-flex min-w-[2.5rem] items-center justify-center gap-1 rounded-md border border-[#6b6b6b] px-3 py-2 text-sm font-medium text-[#222222] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0066bf]";
const pageCurrentClass =
  "inline-flex min-w-[2.5rem] items-center justify-center rounded-md bg-[#0066bf] px-3 py-2 text-sm font-semibold text-white";
const pageDisabledClass =
  "inline-flex items-center gap-1 rounded-md border border-[#d4d4d4] px-3 py-2 text-sm text-[#767676]";

export function PodcastBrowser({
  episodes,
  initialQuery = "",
  initialPage = 1
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(initialPage);
  const [liveMessage, setLiveMessage] = useState("");

  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const didMountRef = useRef(false);
  const pageChangedByUserRef = useRef(false);

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedQuery) return episodes;
    return episodes.filter((episode) =>
      `${episode.title} ${episode.showNotes}`
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [episodes, normalizedQuery]);

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
    if (safePage > 1) params.set("page", String(safePage));
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false
    });
  }, [query, safePage, pathname, router]);

  // Announce the result count (debounced so typing does not spam).
  useEffect(() => {
    const handle = setTimeout(() => {
      if (filtered.length === 0) {
        setLiveMessage("No episodes found. Try a different search.");
      } else {
        setLiveMessage(
          `${filtered.length} ${filtered.length === 1 ? "episode" : "episodes"} found` +
            (totalPages > 1 ? `, page ${safePage} of ${totalPages}` : "")
        );
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [filtered.length, safePage, totalPages]);

  // After a USER changes the page, move focus to the results heading. Guarded so
  // typing in the search box never steals focus from the input.
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
        <a href="#iacast-results-heading">Skip to episode results</a>
      </p>

      <form
        role="search"
        method="get"
        action={pathname}
        onSubmit={(event) => event.preventDefault()}
        aria-label="Search iACast episodes"
        className="max-w-md"
      >
        <label htmlFor="episode-search" className="block text-sm font-medium">
          Search episodes by title
        </label>
        <div className="mt-1 flex">
          <span className="inline-flex items-center rounded-l-md border border-r-0 border-input px-2 text-muted-foreground">
            <Search className="h-4 w-4" aria-hidden="true" />
          </span>
          <input
            id="episode-search"
            name="q"
            type="search"
            value={query}
            autoComplete="off"
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
            className="w-full rounded-r-md border border-input px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0066bf]"
            placeholder="e.g. VoiceOver, Apple event"
          />
        </div>
      </form>

      <h3
        id="iacast-results-heading"
        ref={resultsHeadingRef}
        tabIndex={-1}
        className="text-xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0066bf] rounded"
      >
        {filtered.length} {filtered.length === 1 ? "episode" : "episodes"}
      </h3>

      <p role="status" aria-live="polite" className="sr-only">
        {liveMessage}
      </p>

      {filtered.length === 0 ? (
        <p className="text-foreground">
          No episodes match your search. Try a different word or clear the
          search box.
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {visible.map((episode) => {
            const titleId = `episode-${episode.id}`;
            const duration = formatDuration(episode.durationSeconds);
            const spoken = durationSpoken(episode.durationSeconds);
            return (
              <li key={episode.id}>
                <article
                  aria-labelledby={titleId}
                  className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-white"
                >
                  <BrandedMediaFrame
                    src={episode.image}
                    alt=""
                    decorative
                    className="aspect-[16/9]"
                    fallbackLabel="iACast"
                  />
                  <div className="flex flex-1 flex-col p-4">
                    <div className="min-w-0">
                      <h4 id={titleId} className="text-lg font-semibold">
                        <Link
                          href={`/iacast-network/${episode.slug}`}
                          className={linkClass}
                        >
                          {episode.title}
                        </Link>
                      </h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {episode.date ? (
                          <time dateTime={episode.date}>
                            {formatDate(episode.date)}
                          </time>
                        ) : null}
                        {duration ? (
                          <span>
                            {episode.date ? " · " : ""}
                            <span aria-hidden="true">{duration}</span>
                            <span className="sr-only">{spoken}</span>
                          </span>
                        ) : null}
                      </p>
                    </div>

                    {episode.showNotes ? (
                      <p className="mt-3 text-sm">{episode.showNotes}</p>
                    ) : null}

                    {episode.enclosureUrl ? (
                      <div className="mt-auto pt-4">
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
                          <a href={episode.enclosureUrl} className={linkClass} download>
                            Download
                            <span className="sr-only"> {episode.title} (audio)</span>
                          </a>
                        </p>
                      </div>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav aria-label="iACast episode pages" className="mt-8">
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
  );
}
