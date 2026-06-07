"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  /** 1-based index of the current page. */
  page: number;
  /** Total number of pages (>= 1). */
  pageCount: number;
  /** Called with the next 1-based page number. */
  onPageChange: (page: number) => void;
  /**
   * What the pages contain, for the nav's accessible name (e.g. "posts").
   * Renders as `Pagination, {items}`.
   */
  items?: string;
  className?: string;
}

/**
 * Accessible pager for long tables/lists. The page list never renders every
 * row; instead the consumer slices to the current page and we move between
 * pages here.
 *
 * - <nav aria-label> names the control by its items.
 * - Prev/Next are real <button>s with explicit labels; disabled at the ends.
 * - The current page carries aria-current="page" (not color alone), so screen
 *   readers and sighted keyboard users both know where they are.
 */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  items = "results",
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;

  const atStart = page <= 1;
  const atEnd = page >= pageCount;

  // A compact window of page numbers around the current page so very large
  // tables (e.g. 1,543 posts -> dozens of pages) don't render a huge button
  // strip. Always show first and last with ellipses as needed.
  const pages = pageWindow(page, pageCount);

  return (
    <nav
      aria-label={`Pagination, ${items}`}
      className={cn("flex items-center justify-center gap-1", className)}
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={atStart}
        aria-label="Go to previous page"
        className={pagerButton}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        <span>Previous</span>
      </button>

      <ol className="flex items-center gap-1">
        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <li
              key={`gap-${i}`}
              aria-hidden="true"
              className="px-2 text-muted-foreground"
            >
              &hellip;
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? "page" : undefined}
                aria-label={
                  p === page ? `Page ${p}, current page` : `Go to page ${p}`
                }
                className={cn(
                  pageNumberButton,
                  p === page &&
                    "bg-primary font-semibold text-primary-foreground hover:bg-primary",
                )}
              >
                {p}
              </button>
            </li>
          ),
        )}
      </ol>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={atEnd}
        aria-label="Go to next page"
        className={pagerButton}
      >
        <span>Next</span>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

// Shared control styling. Target size clears 24x24 CSS px (min-h/min-w 2.25rem).
const baseButton =
  "inline-flex min-h-[2.25rem] items-center justify-center gap-1 rounded-md border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50";

const pagerButton = baseButton;

const pageNumberButton = cn(baseButton, "min-w-[2.25rem] px-2 tabular-nums");

/**
 * Build the list of page numbers to show, collapsing long runs into a single
 * "ellipsis" sentinel. Always includes page 1 and the last page.
 */
function pageWindow(page: number, pageCount: number): (number | "ellipsis")[] {
  const span = 1; // pages to show on each side of the current page
  const out: (number | "ellipsis")[] = [];
  const pushed = new Set<number>();

  const add = (p: number) => {
    if (p >= 1 && p <= pageCount && !pushed.has(p)) {
      pushed.add(p);
      out.push(p);
    }
  };

  add(1);
  if (page - span > 2) out.push("ellipsis");
  for (let p = page - span; p <= page + span; p++) add(p);
  if (page + span < pageCount - 1) out.push("ellipsis");
  add(pageCount);

  return out;
}
