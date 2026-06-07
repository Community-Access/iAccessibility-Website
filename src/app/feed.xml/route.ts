import { getPostsPage } from "@/lib/content/wordpress";
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
  const { posts } = await getPostsPage(1, 50);
  const site = absoluteUrl();
  const self = absoluteUrl("/feed.xml");

  const items = posts
    .map((post) => {
      const link = absoluteUrl(post.href);
      const pubDate = post.date ? new Date(post.date).toUTCString() : "";
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>${pubDate ? `\n      <pubDate>${pubDate}</pubDate>` : ""}${post.author ? `\n      <dc:creator>${escapeXml(post.author)}</dc:creator>` : ""}
      <description>${escapeXml(post.excerpt)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>iAccessibility</title>
    <link>${site}</link>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
    <description>Making Success Accessible — accessible technology reporting, podcasts, and app discovery.</description>
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
