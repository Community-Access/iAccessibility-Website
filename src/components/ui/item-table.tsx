import type { ReactNode } from "react";
import Link from "next/link";

// Adapted from the Start-testing ItemTable (proven accessible), re-themed to the
// iAccessibility light palette and made a Server Component so admin pages can
// pass server-rendered cell content (incl. server-action forms).

export interface ItemTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  /** Use this column's cell as the row header (<th scope="row">). */
  rowHeader?: boolean;
  render: (item: T) => ReactNode;
}

export interface ItemTableProps<T> {
  /** Accessible caption / name for the table. */
  caption: string;
  /** Stable id used for aria-labelledby + skip-link targets. */
  headingId?: string;
  columns: ItemTableColumn<T>[];
  items: T[];
  getItemKey: (item: T) => string;
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
  emptyTitle = "Nothing here yet",
  emptyMessage = "There are no items to display.",
  getItemHref,
  nameColumnKey
}: ItemTableProps<T>) {
  const tableId =
    headingId || `table-${caption.toLowerCase().replace(/\W+/g, "-")}`;

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-white p-8 text-center">
        <h3 className="text-lg font-semibold text-[#222222]">{emptyTitle}</h3>
        <p className="mt-1 text-[#595959]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <a
        href={`#${tableId}-bottom`}
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:bg-[#0066bf] focus:px-4 focus:py-2 focus:text-white focus:outline-none"
      >
        Skip to bottom of {caption}
      </a>

      <div
        role="region"
        aria-label={`${caption} (scrollable)`}
        tabIndex={0}
        className="overflow-x-auto rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
      >
        <table className="w-full" aria-labelledby={tableId}>
          <caption id={tableId} className="sr-only">
            {caption} &mdash; {items.length} item
            {items.length === 1 ? "" : "s"}
          </caption>
          <thead>
            <tr className="bg-muted">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-3 text-sm font-semibold text-[#222222] ${alignClass(col.align)}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={getItemKey(item)} className="border-t border-border">
                {columns.map((col) => {
                  const href =
                    col.key === nameColumnKey && getItemHref
                      ? getItemHref(item)
                      : null;
                  const content = href ? (
                    <Link href={href} className="text-[#0f6cba] hover:underline">
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
                        className={`px-4 py-3 font-normal ${alignClass(col.align)}`}
                      >
                        {content}
                      </th>
                    );
                  }
                  return (
                    <td
                      key={col.key}
                      className={`px-4 py-3 ${alignClass(col.align)}`}
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

      <div id={`${tableId}-bottom`}>
        <a
          href={`#${tableId}`}
          className="sr-only focus:not-sr-only focus:inline-block focus:rounded-md focus:bg-[#0066bf] focus:px-4 focus:py-2 focus:text-white focus:outline-none"
        >
          Skip to top of {caption}
        </a>
      </div>
    </div>
  );
}
