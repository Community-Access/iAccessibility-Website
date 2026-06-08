"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Filter } from "lucide-react";
import { BrandedMediaFrame } from "@/components/layout/branded-media-frame";
import { Modal, ModalActions, ModalButton } from "@/components/ui/modal";
import type { DirectoryEntrySummary } from "@/lib/content/wordpress";

const DEFAULT_RECENT = 10;

export function DirectoryBrowser({
  entries,
  categories,
  platforms
}: {
  entries: DirectoryEntrySummary[];
  categories: string[];
  platforms: string[];
}) {
  // Category is a single-select quick filter (radio group). Search + platforms
  // are staged in the Filter modal and applied on "Apply".
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [activePlatforms, setActivePlatforms] = useState<string[]>([]);

  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingSearch, setPendingSearch] = useState("");
  const [pendingPlatforms, setPendingPlatforms] = useState<string[]>([]);

  const [announcement, setAnnouncement] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
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

  // id descending = most recent first.
  const byRecency = useMemo(
    () => [...entries].sort((a, b) => b.id - a.id),
    [entries]
  );

  const filtered = useMemo(() => {
    let list = byRecency;
    if (selectedCategory) {
      list = list.filter((entry) =>
        entry.categories.includes(selectedCategory)
      );
    }
    if (activePlatforms.length > 0) {
      list = list.filter((entry) =>
        activePlatforms.some((platform) => entry.platforms.includes(platform))
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
  }, [byRecency, selectedCategory, activePlatforms, search]);

  const hasActiveFilter = Boolean(
    selectedCategory || search.trim() || activePlatforms.length
  );
  const visible = hasActiveFilter ? filtered : filtered.slice(0, DEFAULT_RECENT);
  const isSearching = Boolean(search.trim());
  const headingText = isSearching
    ? "Search results"
    : selectedCategory || "Recent apps";
  const activeFilterCount = (search.trim() ? 1 : 0) + activePlatforms.length;

  // Announce result changes (never on initial mount).
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const n = visible.length;
    if (n === 0) {
      setAnnouncement(
        isSearching ? `No apps found for "${search.trim()}".` : "No apps found."
      );
    } else if (selectedCategory && !isSearching) {
      setAnnouncement(
        `Loaded ${n} app${n === 1 ? "" : "s"} in ${selectedCategory}.`
      );
    } else {
      setAnnouncement(`${n} app${n === 1 ? "" : "s"} found.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.length, selectedCategory, search]);

  function selectCategory(category: string) {
    setSelectedCategory(category);
    // Move focus to the results heading so VO lands on the new context.
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function openFilter() {
    setPendingSearch(search);
    setPendingPlatforms(activePlatforms);
    setFilterOpen(true);
  }

  function applyFilter() {
    setSearch(pendingSearch);
    setActivePlatforms(pendingPlatforms);
    setFilterOpen(false);
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function togglePendingPlatform(platform: string) {
    setPendingPlatforms((current) =>
      current.includes(platform)
        ? current.filter((value) => value !== platform)
        : [...current, platform]
    );
  }

  const categoryOptions = [
    { value: "", label: "All apps", count: entries.length },
    ...categories.map((category) => ({
      value: category,
      label: category,
      count: categoryCounts.get(category) ?? 0
    }))
  ];

  return (
    <div className="space-y-6">
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <fieldset className="min-w-0">
          <legend className="mb-2 text-lg font-semibold text-[#222222]">
            Categories
          </legend>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((option) => (
              <label key={option.value || "all"} className="cursor-pointer">
                <input
                  type="radio"
                  name="directory-category"
                  value={option.value}
                  checked={selectedCategory === option.value}
                  onChange={() => selectCategory(option.value)}
                  className="peer sr-only"
                />
                <span className="inline-flex items-center rounded-full border border-[#767676] px-3 py-1.5 text-sm font-medium text-[#222222] hover:bg-muted peer-checked:border-[#0066bf] peer-checked:bg-[#0066bf] peer-checked:text-white peer-checked:before:mr-1 peer-checked:before:content-['✓'] peer-checked:hover:bg-[#035a9e] peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
                  {option.label}
                  <span aria-hidden="true">&nbsp;({option.count})</span>
                  <span className="sr-only">
                    , {option.count} app{option.count === 1 ? "" : "s"}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          ref={filterButtonRef}
          type="button"
          onClick={openFilter}
          aria-haspopup="dialog"
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-[#767676] px-4 py-2 text-sm font-semibold text-[#222222] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filter
          {activeFilterCount > 0 ? (
            <>
              <span className="sr-only">, {activeFilterCount} active</span>
              <span
                aria-hidden="true"
                className="rounded-full bg-[#0066bf] px-1.5 text-xs font-bold text-white"
              >
                {activeFilterCount}
              </span>
            </>
          ) : null}
        </button>
      </div>

      <section aria-labelledby="directory-results-heading">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="directory-results-heading"
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-semibold text-[#222222] focus:outline-none"
          >
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
              Try a different category or adjust your filters.
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
                      {entry.description ? (
                        <p className="mt-2 text-sm text-[#595959]">
                          {entry.description}
                        </p>
                      ) : null}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Modal
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter apps"
        description="Search by name and narrow by platform, then apply."
        triggerRef={filterButtonRef}
      >
        <div className="space-y-5">
          <div>
            <label
              htmlFor="directory-filter-search"
              className="block text-sm font-semibold"
            >
              Search apps
            </label>
            <input
              id="directory-filter-search"
              type="search"
              value={pendingSearch}
              onChange={(event) => setPendingSearch(event.target.value)}
              placeholder="App name or description"
              className="mt-1 w-full rounded-md border border-[#767676] bg-white px-3 py-2 text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          {platforms.length > 0 ? (
            <fieldset>
              <legend className="text-sm font-semibold">Platforms</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {platforms.map((platform) => (
                  <label
                    key={platform}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={pendingPlatforms.includes(platform)}
                      onChange={() => togglePendingPlatform(platform)}
                      className="h-4 w-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    {platform}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
        </div>

        <ModalActions>
          <ModalButton
            variant="secondary"
            onClick={() => {
              setPendingSearch("");
              setPendingPlatforms([]);
            }}
          >
            Clear
          </ModalButton>
          <ModalButton variant="primary" onClick={applyFilter}>
            Apply filters
          </ModalButton>
        </ModalActions>
      </Modal>
    </div>
  );
}
