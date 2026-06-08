"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Filter, Search, X } from "lucide-react";
import { BrandedMediaFrame } from "@/components/layout/branded-media-frame";
import { Modal, ModalActions, ModalButton } from "@/components/ui/modal";
import {
  DIRECTORY_ACCESSIBILITY_RATINGS,
  directoryAccessibilityRatingLabel,
  type DirectoryEntrySummary
} from "@/lib/content/wordpress";

const DEFAULT_RECENT = 10;
const DEFAULT_RATINGS = DIRECTORY_ACCESSIBILITY_RATINGS.map(
  (rating) => rating.value
);

type FilterKind = "category" | "platform" | "rating";

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function countLabel(count: number) {
  return `${count} app${count === 1 ? "" : "s"}`;
}

function DescriptionBlock({ description }: { description: string }) {
  const text = description.trim();
  const limit = 320;
  if (text.length <= limit) {
    return <p className="mt-2 text-sm text-[#595959]">{text}</p>;
  }

  return (
    <div className="mt-2 text-sm text-[#595959]">
      <p>{text.slice(0, limit).trim()}...</p>
      <details className="mt-2">
        <summary className="cursor-pointer font-semibold text-[#0f6cba] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          Show full description
        </summary>
        <p className="mt-2">{text}</p>
      </details>
    </div>
  );
}

export function DirectoryBrowser({
  entries,
  categories,
  platforms,
  ratings
}: {
  entries: DirectoryEntrySummary[];
  categories: string[];
  platforms: string[];
  ratings: string[];
}) {
  const [search, setSearch] = useState("");
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activePlatforms, setActivePlatforms] = useState<string[]>([]);
  const [activeRatings, setActiveRatings] = useState<string[]>([]);

  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingCategories, setPendingCategories] = useState<string[]>([]);
  const [pendingPlatforms, setPendingPlatforms] = useState<string[]>([]);
  const [pendingRatings, setPendingRatings] = useState<string[]>([]);

  const [announcement, setAnnouncement] = useState("");
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterFirstFieldRef = useRef<HTMLInputElement>(null);
  const didMount = useRef(false);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      for (const category of entry.categories) {
        counts.set(category, (counts.get(category) ?? 0) + 1);
      }
    }
    return counts;
  }, [entries]);

  const platformCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      for (const platform of entry.platforms) {
        counts.set(platform, (counts.get(platform) ?? 0) + 1);
      }
    }
    return counts;
  }, [entries]);

  const ratingCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      if (entry.accessibilityRating) {
        counts.set(
          entry.accessibilityRating,
          (counts.get(entry.accessibilityRating) ?? 0) + 1
        );
      }
    }
    return counts;
  }, [entries]);

  const ratingOptions = useMemo(() => {
    const merged = new Set([...DEFAULT_RATINGS, ...ratings]);
    return Array.from(merged);
  }, [ratings]);

  // id descending = most recent first.
  const byRecency = useMemo(
    () => [...entries].sort((a, b) => b.id - a.id),
    [entries]
  );

  const filtered = useMemo(() => {
    let list = byRecency;
    if (activeCategories.length > 0) {
      list = list.filter((entry) =>
        activeCategories.some((category) => entry.categories.includes(category))
      );
    }
    if (activePlatforms.length > 0) {
      list = list.filter((entry) =>
        activePlatforms.some((platform) => entry.platforms.includes(platform))
      );
    }
    if (activeRatings.length > 0) {
      list = list.filter(
        (entry) =>
          entry.accessibilityRating &&
          activeRatings.includes(entry.accessibilityRating)
      );
    }
    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (entry) =>
          entry.appName.toLowerCase().includes(query) ||
          entry.description.toLowerCase().includes(query)
      );
    }
    return list;
  }, [byRecency, activeCategories, activePlatforms, activeRatings, search]);

  const hasActiveFilter = Boolean(
    search.trim() ||
      activeCategories.length ||
      activePlatforms.length ||
      activeRatings.length
  );
  const visible = hasActiveFilter ? filtered : filtered.slice(0, DEFAULT_RECENT);
  const activeFilterCount =
    activeCategories.length + activePlatforms.length + activeRatings.length;
  const headingText = search.trim()
    ? "Search results"
    : activeFilterCount > 0
      ? "Filtered apps"
      : "Recent apps";

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const n = visible.length;
    const query = search.trim();
    const timer = window.setTimeout(() => {
      if (n === 0) {
        setAnnouncement(
          query ? `No apps found for "${query}".` : "No apps found."
        );
      } else {
        setAnnouncement(`${n} app${n === 1 ? "" : "s"} found.`);
      }
    }, 450);
    setAnnouncement("");
    return () => window.clearTimeout(timer);
  }, [
    visible.length,
    search,
    activeCategories,
    activePlatforms,
    activeRatings
  ]);

  function openFilter() {
    setPendingCategories(activeCategories);
    setPendingPlatforms(activePlatforms);
    setPendingRatings(activeRatings);
    setFilterOpen(true);
  }

  function applyFilter() {
    setActiveCategories(pendingCategories);
    setActivePlatforms(pendingPlatforms);
    setActiveRatings(pendingRatings);
    setFilterOpen(false);
  }

  function clearFilters() {
    setSearch("");
    setActiveCategories([]);
    setActivePlatforms([]);
    setActiveRatings([]);
    setPendingCategories([]);
    setPendingPlatforms([]);
    setPendingRatings([]);
  }

  function removeFilter(kind: FilterKind, value: string) {
    if (kind === "category") {
      setActiveCategories((current) => current.filter((item) => item !== value));
    }
    if (kind === "platform") {
      setActivePlatforms((current) => current.filter((item) => item !== value));
    }
    if (kind === "rating") {
      setActiveRatings((current) => current.filter((item) => item !== value));
    }
  }

  function filterChip(kind: FilterKind, value: string) {
    const prefix =
      kind === "category" ? "Category" : kind === "platform" ? "Platform" : "Rating";
    return (
      <button
        key={`${kind}-${value}`}
        type="button"
        onClick={() => removeFilter(kind, value)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#767676] bg-white px-3 py-1 text-sm font-medium text-[#222222] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`Remove ${prefix.toLowerCase()} filter ${
          kind === "rating" ? directoryAccessibilityRatingLabel(value) : value
        }`}
      >
        <span className="sr-only">{prefix}: </span>
        {kind === "rating" ? directoryAccessibilityRatingLabel(value) : value}
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>

      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <label
              htmlFor="directory-search"
              className="block text-sm font-semibold text-[#222222]"
            >
              Search apps
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-[2.35rem] h-5 w-5 text-[#595959]"
              aria-hidden="true"
            />
            <input
              id="directory-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="App name or description"
              className="mt-1 w-full rounded-md border border-[#767676] bg-white py-2 pl-10 pr-3 text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <button
            ref={filterButtonRef}
            type="button"
            onClick={openFilter}
            aria-haspopup="dialog"
            className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:self-end ${
              activeFilterCount > 0
                ? "border-[#0066bf] bg-[#0066bf] text-white hover:bg-[#035a9e]"
                : "border-[#767676] bg-white text-[#222222] hover:bg-muted"
            }`}
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            Filters
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-white px-1.5 text-xs font-bold text-[#0066bf]">
                <span className="sr-only">, </span>
                {activeFilterCount}
                <span className="sr-only"> active</span>
              </span>
            ) : null}
          </button>
        </div>

        {hasActiveFilter ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-[#b91c1c] hover:bg-[#fee2e2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Clear all
            </button>
            <div className="flex flex-wrap gap-2">
              {activeCategories.map((category) =>
                filterChip("category", category)
              )}
              {activePlatforms.map((platform) =>
                filterChip("platform", platform)
              )}
              {activeRatings.map((rating) => filterChip("rating", rating))}
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="directory-results-heading" className="text-2xl font-semibold text-[#222222]">
            {headingText}
          </h2>
          <p className="text-sm text-[#595959]">
            {visible.length} app{visible.length === 1 ? "" : "s"}
            {!hasActiveFilter && entries.length > DEFAULT_RECENT
              ? ` (most recent of ${entries.length})`
              : ""}
          </p>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-lg border border-[#767676] bg-white p-8 text-center">
            <h3 className="text-lg font-semibold text-[#222222]">
              No apps found
            </h3>
            <p className="mt-1 text-[#595959]">
              Try a different search or adjust your filters.
            </p>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((entry) => {
              const href = entry.appStoreUrl || entry.websiteUrl || null;
              return (
                <li key={`${entry.id}-${entry.slug}`}>
                  <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-white shadow-wordpress">
                    <BrandedMediaFrame
                      src={entry.iconUrl}
                      alt=""
                      decorative
                      className="aspect-[16/10]"
                      fallbackLabel="App Directory"
                    />
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="text-lg font-semibold">
                        {href ? (
                          <a
                            href={href}
                            rel="noopener noreferrer"
                            target="_blank"
                            className="text-[#0f6cba] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            {entry.appName}
                            <span className="sr-only"> (opens in a new tab)</span>
                          </a>
                        ) : (
                          entry.appName
                        )}
                      </h3>
                      {entry.platforms.length > 0 ? (
                        <p className="mt-1 text-xs font-medium uppercase text-[#595959]">
                          {entry.platforms.join(" · ")}
                        </p>
                      ) : null}
                      {entry.accessibilityRating ? (
                        <p className="mt-2 text-sm font-medium text-[#222222]">
                          Accessibility rating:{" "}
                          {directoryAccessibilityRatingLabel(entry.accessibilityRating)}
                        </p>
                      ) : null}
                      {entry.description ? (
                        <DescriptionBlock description={entry.description} />
                      ) : null}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter apps"
        description="Select categories, platforms, and accessibility ratings to narrow the directory."
        triggerRef={filterButtonRef}
        initialFocus="title"
      >
        <div className="space-y-6">
          <fieldset className="border-0 p-0">
            <legend className="text-sm font-semibold">Categories</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {categories.map((category, index) => {
                const count = categoryCounts.get(category) ?? 0;
                return (
                  <label key={category} className="flex items-center gap-2 text-sm">
                    <input
                      ref={index === 0 ? filterFirstFieldRef : undefined}
                      type="checkbox"
                      checked={pendingCategories.includes(category)}
                      onChange={() =>
                        setPendingCategories((current) =>
                          toggleValue(current, category)
                        )
                      }
                      className="h-4 w-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <span>
                      {category}
                      <span aria-hidden="true"> ({count})</span>
                      <span className="sr-only">, {countLabel(count)}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {platforms.length > 0 ? (
            <fieldset className="border-0 p-0">
              <legend className="text-sm font-semibold">Platforms</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {platforms.map((platform) => {
                  const count = platformCounts.get(platform) ?? 0;
                  return (
                    <label key={platform} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={pendingPlatforms.includes(platform)}
                        onChange={() =>
                          setPendingPlatforms((current) =>
                            toggleValue(current, platform)
                          )
                        }
                        className="h-4 w-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                      <span>
                        {platform}
                        <span aria-hidden="true"> ({count})</span>
                        <span className="sr-only">, {countLabel(count)}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          <fieldset className="border-0 p-0">
            <legend className="text-sm font-semibold">
              Accessibility rating
            </legend>
            <div className="mt-2 space-y-2">
              {ratingOptions.map((rating) => {
                const count = ratingCounts.get(rating) ?? 0;
                return (
                  <label key={rating} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={pendingRatings.includes(rating)}
                      onChange={() =>
                        setPendingRatings((current) =>
                          toggleValue(current, rating)
                        )
                      }
                      className="h-4 w-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <span>
                      {directoryAccessibilityRatingLabel(rating)}
                      <span aria-hidden="true"> ({count})</span>
                      <span className="sr-only">, {countLabel(count)}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>

        <ModalActions>
          <ModalButton
            variant="secondary"
            onClick={() => {
              setPendingCategories([]);
              setPendingPlatforms([]);
              setPendingRatings([]);
            }}
          >
            Clear all
          </ModalButton>
          <ModalButton variant="primary" onClick={applyFilter}>
            Apply filters
          </ModalButton>
        </ModalActions>
      </Modal>
    </div>
  );
}
