"use client";

import {
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";

/**
 * Generic, reusable, accessible responsive data table.
 *
 * Ported from Beyond-The-Gallery-Web/components/admin/users-tab.tsx and
 * generalised to column definitions, re-coloured onto the iAccessibility
 * design tokens. Implements docs/accessibility-foundation.md section 3:
 *
 * - Desktop: a real <table> with an aria-label (or sr-only <caption>), every
 *   header <th scope="col">, and an optional <th scope="row"> row-label column.
 * - Mobile (md:hidden): role="list" / role="listitem" card layout.
 * - Loading: role="status" with an aria-label.
 * - Empty state: plain text (no role).
 * - Row actions: consumer renders name-specific labelled controls per row.
 * - Sort: a labelled <select aria-label="Sort {items} by"> driving a callback.
 * - Row-set changes (sort/filter/refresh) announced via a polite live region.
 * - Long tables: "skip to end / skip to top" anchors + pagination so we never
 *   render thousands of rows at once.
 */

// In-table skip anchors: visually hidden until focused, then a real on-token
// chip. Uses only existing utilities (the global .skip-link is reserved for the
// page-level skip-to-main link).
const skipLinkClass =
  "sr-only focus:not-sr-only focus:inline-block focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:underline";

export interface DataTableColumn<T> {
  /** Stable key; also used for the row-label cell when `rowHeader` is set. */
  key: string;
  /** Visible column header text. Use `srHeader` for a hidden header (actions). */
  header: ReactNode;
  /** Render the cell for a row. */
  cell: (row: T) => ReactNode;
  /**
   * When true, this column's desktop cell is a <th scope="row"> (the row's
   * label) and its mobile card value leads the card. Use for the name column.
   */
  rowHeader?: boolean;
  /** Hide the header text visually but keep it for assistive tech. */
  srHeader?: boolean;
  /** Hide this column's label/value in the mobile card layout. */
  hideOnMobile?: boolean;
  /** Right-align the column (e.g. an actions column). */
  align?: "left" | "right";
  /** Extra classes for this column's desktop cells. */
  cellClassName?: string;
}

export interface DataTableSort {
  value: string;
  label: string;
}

export interface DataTableProps<T> {
  /** Accessible name for the table and the mobile list. Required. */
  ariaLabel: string;
  columns: DataTableColumn<T>[];
  /** Rows for the CURRENT page (already sorted/filtered/sliced by the caller). */
  rows: T[];
  /** Stable React key per row. */
  getRowKey: (row: T) => string;
  /**
   * Accessible name for each row, used for the mobile card's aria-label and as
   * the `{name}` the caller weaves into row-action labels.
   */
  getRowName: (row: T) => string;

  /** Loading spinner with role="status". */
  loading?: boolean;
  /** Accessible name for the loading state (e.g. "Loading posts"). */
  loadingLabel?: string;
  /** Plain-text empty state. */
  emptyMessage?: ReactNode;

  /** Plural item noun for the sort label and pagination (e.g. "posts"). */
  items?: string;

  /** Sort options. When provided, renders a labelled <select>. */
  sortOptions?: DataTableSort[];
  sortValue?: string;
  onSortChange?: (value: string) => void;

  /** Optional right-aligned toolbar content (e.g. a Refresh button). */
  toolbar?: ReactNode;
  /**
   * Per-row actions, rendered in the trailing cell on desktop and the card
   * header on mobile. The caller supplies name-specific aria-labels using
   * `name` (e.g. `Edit ${name}`, `Delete ${name}`).
   */
  rowActions?: (row: T, name: string) => ReactNode;

  /** Pagination (omit for short tables). */
  page?: number;
  pageCount?: number;
  onPageChange?: (page: number) => void;
  /** Total row count across all pages, for the count line. */
  totalCount?: number;

  className?: string;
}

export function DataTable<T>({
  ariaLabel,
  columns,
  rows,
  getRowKey,
  getRowName,
  loading = false,
  loadingLabel,
  emptyMessage = "No results found.",
  items = "results",
  sortOptions,
  sortValue,
  onSortChange,
  toolbar,
  rowActions,
  page,
  pageCount,
  onPageChange,
  totalCount,
  className,
}: DataTableProps<T>) {
  const baseId = useId();
  const startId = `${baseId}-table-start`;
  const endId = `${baseId}-table-end`;

  const count = totalCount ?? rows.length;

  // Polite live region: announce when the visible row set changes (sort,
  // filter, refresh, page) without stealing focus.
  // Resolve the active sort's human label so the announcement reads the visible
  // sort choice ("sorted by Newest first"), not the opaque value.
  const sortLabel = sortOptions?.find((opt) => opt.value === sortValue)?.label;

  const announcement = useRowSetAnnouncement({
    loading,
    count,
    page,
    sortValue,
    sortLabel,
    items,
  });

  const hasActions = Boolean(rowActions);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Live region — visually hidden, polite. */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {count} {count === 1 ? singular(items) : items} total
        </p>
        <div className="flex items-center gap-2">
          {sortOptions && sortOptions.length > 0 && (
            <select
              value={sortValue}
              onChange={(e) => onSortChange?.(e.target.value)}
              aria-label={`Sort ${items} by`}
              className="min-h-[2.25rem] rounded-md border border-border bg-background px-2 text-sm text-foreground"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          {toolbar}
        </div>
      </div>

      {loading ? (
        <div
          className="flex justify-center py-12"
          role="status"
          aria-label={loadingLabel ?? `Loading ${items}`}
        >
          <Loader2
            className="h-8 w-8 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-12 text-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <>
          {/* Skip over a long table to its end. */}
          <a href={`#${endId}`} className={skipLinkClass}>
            Skip to end of {items} table
          </a>

          {/* Mobile card layout. */}
          <div
            id={startId}
            className="space-y-3 md:hidden"
            role="list"
            aria-label={ariaLabel}
          >
            {rows.map((row) => {
              const name = getRowName(row);
              return (
                <div
                  key={getRowKey(row)}
                  role="listitem"
                  className="rounded-lg border border-border bg-card p-4 text-card-foreground"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      {columns
                        .filter((c) => !c.hideOnMobile)
                        .map((col) => (
                          <div
                            key={col.key}
                            className={cn(
                              "min-w-0",
                              col.rowHeader ? "font-medium" : "text-sm",
                            )}
                          >
                            {!col.rowHeader && !col.srHeader && (
                              <span className="text-muted-foreground">
                                {col.header}:{" "}
                              </span>
                            )}
                            {col.cell(row)}
                          </div>
                        ))}
                    </div>
                    {hasActions && (
                      <div className="flex shrink-0 items-center gap-1">
                        {rowActions?.(row, name)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table layout. */}
          <div className="hidden overflow-hidden rounded-lg border border-border md:block">
            <table className="w-full" aria-label={ariaLabel}>
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className={cn(
                        "px-4 py-3 text-sm font-medium text-muted-foreground",
                        col.align === "right" ? "text-right" : "text-left",
                      )}
                    >
                      {col.srHeader ? (
                        <span className="sr-only">{col.header}</span>
                      ) : (
                        col.header
                      )}
                    </th>
                  ))}
                  {hasActions && (
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-sm font-medium text-muted-foreground"
                    >
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const name = getRowName(row);
                  return (
                    <tr
                      key={getRowKey(row)}
                      className="border-b border-border last:border-0"
                    >
                      {columns.map((col) => {
                        const content = col.cell(row);
                        const cellClass = cn(
                          "px-4 py-3 text-sm",
                          col.align === "right" ? "text-right" : "text-left",
                          col.rowHeader
                            ? "font-medium text-foreground"
                            : "text-muted-foreground",
                          col.cellClassName,
                        );
                        return col.rowHeader ? (
                          <th
                            key={col.key}
                            scope="row"
                            className={cn(cellClass, "font-medium")}
                          >
                            {content}
                          </th>
                        ) : (
                          <td key={col.key} className={cellClass}>
                            {content}
                          </td>
                        );
                      })}
                      {hasActions && (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {rowActions?.(row, name)}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* End marker + skip back to the top of the table. */}
          <div id={endId} tabIndex={-1}>
            <a href={`#${startId}`} className={skipLinkClass}>
              Skip to top of {items} table
            </a>
          </div>

          {page != null && pageCount != null && onPageChange && (
            <Pagination
              page={page}
              pageCount={pageCount}
              onPageChange={onPageChange}
              items={items}
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * Build the avatar initials fallback. Decorative avatar images should use
 * `alt="" aria-hidden`; this provides the visible initials behind them.
 */
export function initialsFor(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Decorative avatar: real image when available (alt="" aria-hidden), initials
 * fallback otherwise. Never an accessible name — the row's text carries it.
 */
export function DataTableAvatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  if (src && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        aria-hidden="true"
        onError={() => setErrored(true)}
        className={cn(
          "h-8 w-8 shrink-0 rounded-full object-cover",
          className,
        )}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground",
        className,
      )}
    >
      {initialsFor(name)}
    </div>
  );
}

/**
 * Compose a polite, debounced announcement describing the current row set.
 * Announces sort changes, page changes, and load completions so screen-reader
 * users hear "Showing 25 posts, sorted by Newest first, page 2 of 62".
 */
function useRowSetAnnouncement({
  loading,
  count,
  page,
  sortValue,
  sortLabel,
  items,
}: {
  loading: boolean;
  count: number;
  page?: number;
  sortValue?: string;
  sortLabel?: string;
  items: string;
}): string {
  const [message, setMessage] = useState("");
  const firstRender = useRef(true);

  useEffect(() => {
    // Don't announce the initial render — only subsequent changes.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (loading) return;

    const parts = [`Showing ${count} ${count === 1 ? singular(items) : items}`];
    // Speak the human sort label ("sorted by Newest first") so a sort change is
    // self-describing, not just "showing N items".
    if (sortLabel) parts.push(`sorted by ${sortLabel}`);
    if (page != null) parts.push(`page ${page}`);
    // The aria-live region IS the external system here: when the row set
    // changes we deliberately write a fresh message so the screen reader
    // re-announces it. This is a one-shot setState per data change, not a loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessage(parts.join(", ") + ".");
  }, [loading, count, page, sortValue, sortLabel, items]);

  // sortValue stays in the dep array so a re-sort to the same label still
  // re-announces; the label is what gets spoken.
  return useMemo(() => message, [message]);
}

/** Naive singularisation for the count line ("posts" -> "post"). */
function singular(items: string): string {
  if (items.endsWith("ies")) return items.slice(0, -3) + "y";
  if (items.endsWith("s")) return items.slice(0, -1);
  return items;
}
