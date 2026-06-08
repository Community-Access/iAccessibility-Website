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
  /** Stable id used for the table caption. */
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
      <div className="rounded-lg border border-[#767676] bg-white p-8 text-center">
        <h3 className="text-lg font-semibold text-[#222222]">{emptyTitle}</h3>
        <p className="mt-1 text-[#595959]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-[#767676]">
        <table className="w-full table-fixed">
          <caption id={tableId} className="sr-only">
            {caption}
          </caption>
          <thead>
            <tr className="bg-muted">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`break-words px-3 py-3 text-sm font-semibold text-[#222222] ${alignClass(col.align)}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={getItemKey(item)} className="border-t border-[#767676]">
                {columns.map((col) => {
                  const href =
                    col.key === nameColumnKey && getItemHref
                      ? getItemHref(item)
                      : null;
                  const content = href ? (
                    <Link
                      href={href}
                      className="break-words text-[#0f6cba] underline underline-offset-2 hover:no-underline"
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
                        className={`break-words px-3 py-3 font-normal align-top ${alignClass(col.align)}`}
                      >
                        {content}
                      </th>
                    );
                  }
                  return (
                    <td
                      key={col.key}
                      className={`break-words px-3 py-3 align-top ${alignClass(col.align)}`}
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
  );
}
