import Link from "next/link";

const LINK =
  "inline-flex min-w-[2.5rem] items-center justify-center gap-1 rounded-md border border-[#6b6b6b] px-3 py-2 text-sm font-medium text-[#222222] no-underline hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]";
const CURRENT =
  "inline-flex min-w-[2.5rem] items-center justify-center rounded-md bg-[#0066bf] px-3 py-2 text-sm font-semibold text-white";
const DISABLED =
  "inline-flex items-center gap-1 rounded-md border border-[#d4d4d4] px-3 py-2 text-sm text-[#767676]";

export function Pagination({
  page,
  totalPages,
  hrefFor
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const windowSize = 2;
  const start = Math.max(1, page - windowSize);
  const end = Math.min(totalPages, page + windowSize);
  const pages: number[] = [];
  for (let p = start; p <= end; p += 1) pages.push(p);

  return (
    <nav aria-label="Pagination" className="mt-8">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} rel="prev" className={LINK}>
              <span aria-hidden="true">&larr;</span> Previous
            </Link>
          ) : (
            <span className={DISABLED} aria-hidden="true">
              <span>&larr;</span> Previous
            </span>
          )}
        </li>

        {start > 1 ? (
          <>
            <li>
              <Link href={hrefFor(1)} className={LINK} aria-label="Page 1">
                1
              </Link>
            </li>
            {start > 2 ? (
              <li aria-hidden="true" className="px-1 text-[#595959]">
                &hellip;
              </li>
            ) : null}
          </>
        ) : null}

        {pages.map((p) =>
          p === page ? (
            <li key={p}>
              <span
                className={CURRENT}
                aria-current="page"
                aria-label={`Page ${p}, current page`}
              >
                {p}
              </span>
            </li>
          ) : (
            <li key={p}>
              <Link href={hrefFor(p)} className={LINK} aria-label={`Page ${p}`}>
                {p}
              </Link>
            </li>
          )
        )}

        {end < totalPages ? (
          <>
            {end < totalPages - 1 ? (
              <li aria-hidden="true" className="px-1 text-[#595959]">
                &hellip;
              </li>
            ) : null}
            <li>
              <Link
                href={hrefFor(totalPages)}
                className={LINK}
                aria-label={`Page ${totalPages}`}
              >
                {totalPages}
              </Link>
            </li>
          </>
        ) : null}

        <li>
          {page < totalPages ? (
            <Link href={hrefFor(page + 1)} rel="next" className={LINK}>
              Next <span aria-hidden="true">&rarr;</span>
            </Link>
          ) : (
            <span className={DISABLED} aria-hidden="true">
              Next <span>&rarr;</span>
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
