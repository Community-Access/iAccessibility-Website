import {
  eventDateLabel,
  eventPath,
  eventTimeLabel,
  eventTypeLabel,
  getPublishedEvents
} from "@/lib/events";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return (value || "").replace(/[<>&'"]/g, (c) =>
    c === "<"
      ? "&lt;"
      : c === ">"
        ? "&gt;"
        : c === "&"
          ? "&amp;"
          : c === "'"
            ? "&apos;"
            : "&quot;"
  );
}

export async function GET() {
  const events = await getPublishedEvents();
  const site = absoluteUrl();
  const self = absoluteUrl("/events/feed.xml");

  const items = events
    .map((event) => {
      const link = absoluteUrl(eventPath(event));
      const pubDate = event.createdAt
        ? new Date(event.createdAt).toUTCString()
        : "";
      const where = event.location?.trim()
        ? event.location.trim()
        : event.locationUrl
          ? "Online event"
          : "";
      const description = [
        `${eventTypeLabel(event.type)} · ${eventDateLabel(event.eventDate)} at ${eventTimeLabel(event)} ${event.timezone}`,
        where,
        event.description ?? ""
      ]
        .filter(Boolean)
        .join("\n");
      return `    <item>
      <title>${escapeXml(event.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>${pubDate ? `\n      <pubDate>${pubDate}</pubDate>` : ""}
      <description>${escapeXml(description)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>iAccessibility Events</title>
    <link>${site}events</link>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
    <description>Upcoming iAccessibility live streams, workshops, meetings, and community events.</description>
    <language>en-us</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600"
    }
  });
}
