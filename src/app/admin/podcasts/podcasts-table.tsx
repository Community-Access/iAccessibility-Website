"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ItemTable, type ItemTableColumn } from "@/components/ui/item-table";
import { formatDate } from "@/lib/utils";

export type EpisodeRow = {
  id: number;
  title: string;
  showTitle: string;
  pubDate: Date | null;
  enclosureUrl: string | null;
};

const PAGE_SIZE = 20;

export function PodcastsTable({ rows }: { rows: EpisodeRow[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [announcement, setAnnouncement] = useState("");
  const statusRef = useRef<HTMLParagraphElement>(null);
  const firstRender = useRef(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (ep) =>
        ep.title.toLowerCase().includes(q) ||
        ep.showTitle.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const q = query.trim();
      setAnnouncement(
        q
          ? filtered.length === 0
            ? `No episodes match "${q}".`
            : `${filtered.length} episode${filtered.length === 1 ? "" : "s"} match "${q}".`
          : `${filtered.length} episode${filtered.length === 1 ? "" : "s"}.`
      );
    }, 400);
    return () => window.clearTimeout(timer);
  }, [filtered.length, query]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    statusRef.current?.focus();
  }, [safePage]);

  const columns: ItemTableColumn<EpisodeRow>[] = [
    {
      key: "title",
      header: "Episode",
      rowHeader: true,
      render: (ep) => <span className="font-medium">{ep.title}</span>
    },
    {
      key: "show",
      header: "Show",
      render: (ep) => ep.showTitle
    },
    {
      key: "date",
      header: "Published",
      render: (ep) => (ep.pubDate ? formatDate(ep.pubDate) : "—")
    },
    {
      key: "listen",
      header: "Audio",
      align: "right",
      render: (ep) =>
        ep.enclosureUrl ? (
          <a
            href={ep.enclosureUrl}
            rel="noopener noreferrer"
            target="_blank"
            aria-label={`Listen to ${ep.title} (opens in a new tab)`}
            className="text-[#0f6cba] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Listen
          </a>
        ) : (
          "—"
        )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <label htmlFor="episode-search" className="block text-sm font-semibold">
          Search episodes
        </label>
        <input
          id="episode-search"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Episode or show title"
          className="mt-1 w-full rounded-md border border-[#767676] bg-white px-3 py-2 text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <ItemTable
        caption="Podcast episodes"
        headingId="podcast-episodes-table"
        columns={columns}
        items={pageRows}
        getItemKey={(ep) => String(ep.id)}
        emptyTitle="No episodes found"
        emptyMessage="No episodes match your search."
      />

      {totalPages > 1 ? (
        <nav
          aria-label="Episodes pagination"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="rounded-md border border-[#767676] px-3 py-2 text-sm font-medium text-[#222222] hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Previous
          </button>
          <p
            ref={statusRef}
            tabIndex={-1}
            className="text-sm text-[#595959] focus:outline-none"
          >
            Page {safePage} of {totalPages}
          </p>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="rounded-md border border-[#767676] px-3 py-2 text-sm font-medium text-[#222222] hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Next
          </button>
        </nav>
      ) : null}
    </div>
  );
}
