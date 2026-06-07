import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { BrandedMediaFrame } from "@/components/layout/branded-media-frame";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContentSummary } from "@/lib/content/wordpress";
import { dateLabel } from "@/lib/content/wordpress";

type ContentListProps = {
  title: string;
  items: ContentSummary[];
  emptyLabel?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
};

export function ContentList({
  title,
  items,
  emptyLabel,
  viewAllHref,
  viewAllLabel
}: ContentListProps) {
  const headingId = `${title.toLowerCase().replace(/\W+/g, "-")}-heading`;

  return (
    <section>
      <h2 id={headingId} className="mb-4 text-2xl font-semibold">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground">
          {emptyLabel ?? "No content is available yet."}
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card
              key={`${item.id}-${item.slug}`}
              className="flex h-full flex-col overflow-hidden"
            >
              <BrandedMediaFrame
                src={item.imageUrl}
                alt=""
                decorative
                className="aspect-[16/10]"
              />
              <CardHeader>
                <CardTitle>
                  <Link href={item.href}>{item.title}</Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  {item.author ? (
                    <>
                      <span>By {item.author}</span>
                      <span aria-hidden="true">&middot;</span>
                    </>
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    <time dateTime={item.date}>{dateLabel(item.date)}</time>
                  </span>
                </p>
                {item.excerpt ? <p>{item.excerpt}</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {viewAllHref && viewAllLabel ? (
        <p className="mt-5">
          <Link
            href={viewAllHref}
            className="font-semibold text-[#0f6cba] underline underline-offset-2 hover:text-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0066bf] rounded"
          >
            {viewAllLabel}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
