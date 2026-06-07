import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE_LOGO_URL } from "@/lib/branding";
import type { ContentSummary } from "@/lib/content/wordpress";
import { dateLabel } from "@/lib/content/wordpress";

type ContentListProps = {
  title: string;
  items: ContentSummary[];
  emptyLabel?: string;
};

export function ContentList({ title, items, emptyLabel }: ContentListProps) {
  return (
    <section aria-labelledby={`${title.toLowerCase().replace(/\W+/g, "-")}-heading`}>
      <h2
        id={`${title.toLowerCase().replace(/\W+/g, "-")}-heading`}
        className="mb-4 text-2xl font-semibold"
      >
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
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.imageAlt || ""}
                  className="h-44 w-full object-cover"
                />
              ) : (
                <div className="flex h-44 w-full items-center justify-center bg-[#eef3f8]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={SITE_LOGO_URL} alt="" className="h-16 w-16" />
                </div>
              )}
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
    </section>
  );
}
