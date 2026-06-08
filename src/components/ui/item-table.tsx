import type { ReactNode } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

// Adapted from the Start-testing ItemTable (proven accessible), re-themed to
// the iAccessibility light palette and kept as a Server Component so admin
// pages can pass server-rendered cell content (incl. server-action forms).
// Full parity with the source: skip-to-top/bottom links, loading state,
// srOnly + width column options. Load-bearing gridline borders stay #767676
// (the token --border #cccccc is too light to read as a boundary).

export interface ItemTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  /** Tailwind width class, e.g. "w-12" or "min-w-[200px]". */
  width?: string;
  /** Visually hide the header text (kept for screen readers). */
  srOnly?: boolean;
  /** Use this column's cell as the row header (<th scope="row">). */
  rowHeader?: boolean;
  render: (item: T) => ReactNode;
}

export interface ItemTableProps<T> {
  /** Accessible caption / name for the table. */
  caption: string;
  /** Stable id used for the table caption + skip-link targets. */
  headingId?: string;
  columns: ItemTableColumn<T>[];
  items: T[];
  getItemKey: (item: T) => string;
  /** Loading state (renders a polite status region). */
  isLoading?: boolean;
  loadingMessage?: string;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyMessage?: string;
  /** Make the named column a link. */
  getItemHref?: (item: T) => string;
  nameColumnKey?: string;
}

function alignClass(align?: "left" | "center" | "right") {
  return align === "center"
    ? "text-center"
    : align === "right"
      ? "text-right"
      : "text-left";
}

export function ItemTable<T>({
  caption,
  headingId,
  columns,
  items,
  getItemKey,
  isLoading = false,
  loadingMessage = "Loading…",
  emptyIcon,
  emptyTitle = "Nothing here yet",
  emptyMessage = "There are no items to display.",
  getItemHref,
  nameColumnKey
}: ItemTableProps<T>) {
  const tableId =
    headingId || `table-${caption.toLowerCase().replace(/\W+/g, "-")}`;

  if (isLoading) {
    return (
      <div
        role="status"
        className="flex items-center justify-center gap-3 rounded-lg border border-[#767676] bg-white py-12"
      >
        <Loader2
          className="h-6 w-6 text-[#595959] motion-safe:animate-spin"
          aria-hidden="true"
        />
        <span className="sr-only">{loadingMessage}</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-[#767676] bg-white p-8 text-center">
        {emptyIcon && (
          <div className="mx-auto mb-3 text-[#595959]" aria-hidden="true">
            {emptyIcon}
          </div>
        )}
        <h3 className="text-lg font-semibold text-[#222222]">{emptyTitle}</h3>
        <p className="mt-1 text-[#595959]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Skip to bottom — hidden until focused, then on-surface and readable. */}
      <a
        href={`#${tableId}-bottom`}
        className="sr-only rounded-md bg-white px-4 py-2 font-medium text-[#0f6cba] underline underline-offset-2 shadow-wordpress focus:not-sr-only focus:absolute focus:z-10 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to bottom of {caption}
      </a>

      <div className="rounded-lg border border-[#767676]">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <caption id={`${tableId}-top`} className="sr-only" tabIndex={-1}>
              {caption} — {items.length} item{items.length === 1 ? "" : "s"}
            </caption>
            <thead>
              <tr className="bg-muted">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={`break-words px-3 py-3 text-sm font-semibold text-[#222222] ${col.width || ""} ${alignClass(col.align)}`}
                  >
                    {col.srOnly ? (
                      <span className="sr-only">{col.header}</span>
                    ) : (
                      col.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={getItemKey(item)}
                  className="border-t border-[#767676]"
                >
                  {columns.map((col) => {
                    const href =
                      col.key === nameColumnKey && getItemHref
                        ? getItemHref(item)
                        : null;
                    const content = href ? (
                      <Link
                        href={href}
                        className="break-words text-[#0f6cba] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {col.render(item)}
                      </Link>
                    ) : (
                      col.render(item)
                    );

                    if (col.rowHeader) {
                      return (
                        <th
                          key={col.key}
                          scope="row"
                          className={`break-words px-3 py-3 align-top font-normal ${col.width || ""} ${alignClass(col.align)}`}
                        >
                          {content}
                        </th>
                      );
                    }
                    return (
                      <td
                        key={col.key}
                        className={`break-words px-3 py-3 align-top ${col.width || ""} ${alignClass(col.align)}`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Skip-link landing target + link back to top. */}
      <div id={`${tableId}-bottom`} tabIndex={-1}>
        <a
          href={`#${tableId}-top`}
          className="sr-only rounded-md bg-white px-4 py-2 font-medium text-[#0f6cba] underline underline-offset-2 shadow-wordpress focus:not-sr-only focus:inline-block focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to top of {caption}
        </a>
      </div>
    </div>
  );
}
