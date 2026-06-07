import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
            <Card key={`${item.id}-${item.slug}`} className="flex h-full flex-col">
              <CardHeader>
                <CardTitle>
                  <Link href={item.href}>{item.title}</Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  <time dateTime={item.date}>{dateLabel(item.date)}</time>
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
