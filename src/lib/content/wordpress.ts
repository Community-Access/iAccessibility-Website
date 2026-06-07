import { count, desc, eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { blogPosts, directoryEntries, pages, podcastEpisodes, podcastShows } from "@/db/schema";
import { formatDate, paragraphsFromText, stripHtml } from "@/lib/utils";

const WORDPRESS_API = "https://iaccessibility.net/wp-json/wp/v2";
const WORDPRESS_ORIGIN = "https://iaccessibility.net";

export type ContentSummary = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  date: string;
  href: string;
  author?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
};

export type ContentDetail = ContentSummary & {
  html: string;
};

export type DirectoryEntrySummary = {
  id: number;
  appName: string;
  slug: string;
  description: string;
  status?: string;
  appStoreUrl?: string | null;
  websiteUrl?: string | null;
  iconUrl?: string | null;
};

export type PodcastEpisodeSummary = {
  id: number;
  title: string;
  slug: string;
  date: string;
  showNotes: string;
  enclosureUrl?: string | null;
};

type WpRendered = {
  rendered?: string;
};

type WpPost = {
  id: number;
  date: string;
  slug: string;
  link: string;
  title: WpRendered;
  excerpt: WpRendered;
  content: WpRendered;
  _embedded?: {
    "wp:featuredmedia"?: Array<{
      source_url?: string;
      alt_text?: string;
    }>;
  };
};

export const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Report", href: "/report" },
  { label: "iACast", href: "/iacast-network" },
  { label: "App Directory", href: "/app-directory" },
  { label: "Community", href: "/plus" },
  { label: "Events", href: "/my-calendar" },
  { label: "About", href: "/about" }
];

export const DIRECTORY_PLATFORMS = [
  "iOS/iPadOS",
  "macOS",
  "VisionOS",
  "tvOS",
  "Windows",
  "Android",
  "Linux"
];

export const DIRECTORY_CATEGORIES = [
  "Books",
  "Business",
  "Developer Tools",
  "Education",
  "Entertainment",
  "Finance",
  "Food and Drink",
  "Games",
  "Graphics and Design",
  "Health and Fitness",
  "Lifestyle",
  "Medical",
  "Music",
  "Navigation",
  "News",
  "Photo and Video",
  "Productivity",
  "Reference",
  "Safari Extensions",
  "Shopping",
  "Social Networking",
  "Sports and Activities",
  "Travel",
  "Utilities",
  "Weather"
];

function decodeEntities(value: string) {
  return value
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

export function normalizeWordPressHtml(html: string) {
  return html
    .replace(/<!--\s*\/?wp:[\s\S]*?-->/g, "")
    .replace(new RegExp(WORDPRESS_ORIGIN, "g"), "")
    .replace(/\sdata-[^=]+="[^"]*"/g, "")
    .replace(/\sclass="wp-block-[^"]*"/g, "")
    .replace(/\[(?:wp_ai_search|my_calendar|pmpro_checkout|submit_event)[^\]]*\]/g, "")
    .trim();
}

function wpToSummary(post: WpPost): ContentSummary {
  const imageUrl = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;

  return {
    id: post.id,
    title: decodeEntities(stripHtml(post.title.rendered ?? "Untitled")),
    slug: post.slug,
    excerpt: decodeEntities(stripHtml(post.excerpt.rendered ?? "")).slice(0, 240),
    date: post.date,
    href: `/blog/${post.slug}`,
    imageUrl
  };
}

async function fetchWp<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${WORDPRESS_API}${path}`, {
      next: { revalidate: 300 },
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getLatestPosts(limit = 8): Promise<ContentSummary[]> {
  if (hasDatabase && db) {
    const rows = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit);

    if (rows.length > 0) {
      return rows.map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt ?? stripHtml(post.body).slice(0, 240),
        date: post.publishedAt?.toISOString() ?? post.createdAt.toISOString(),
        href: `/blog/${post.slug}`,
        author: post.authorName,
        imageUrl: post.featuredImageUrl,
        imageAlt: post.featuredImageAlt
      }));
    }
  }

  const posts = await fetchWp<WpPost[]>(
    `/posts?_embed=wp:featuredmedia&per_page=${limit}`
  );

  return (posts ?? []).map(wpToSummary);
}

export type PostsPage = {
  posts: ContentSummary[];
  page: number;
  totalPages: number;
  total: number;
};

export async function getPostsPage(page = 1, perPage = 12): Promise<PostsPage> {
  const safePage = Math.max(1, Math.floor(page) || 1);

  if (hasDatabase && db) {
    const offset = (safePage - 1) * perPage;
    const [rows, totals] = await Promise.all([
      db
        .select()
        .from(blogPosts)
        .where(eq(blogPosts.status, "published"))
        .orderBy(desc(blogPosts.publishedAt))
        .limit(perPage)
        .offset(offset),
      db
        .select({ value: count() })
        .from(blogPosts)
        .where(eq(blogPosts.status, "published"))
    ]);
    const total = totals[0]?.value ?? 0;

    if (total > 0) {
      return {
        posts: rows.map((post) => ({
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt ?? stripHtml(post.body).slice(0, 240),
          date: post.publishedAt?.toISOString() ?? post.createdAt.toISOString(),
          href: `/blog/${post.slug}`,
          author: post.authorName
        })),
        page: safePage,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
        total
      };
    }
  }

  // Fallback to the live WordPress REST API (single page).
  const posts = await getLatestPosts(perPage);
  return { posts, page: 1, totalPages: 1, total: posts.length };
}

export async function getPostBySlug(slug: string): Promise<ContentDetail | null> {
  if (hasDatabase && db) {
    const row = await db.query.blogPosts.findFirst({
      where: eq(blogPosts.slug, slug)
    });

    if (row && row.status === "published") {
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt ?? stripHtml(row.body).slice(0, 240),
        date: row.publishedAt?.toISOString() ?? row.createdAt.toISOString(),
        href: `/blog/${row.slug}`,
        author: row.authorName,
        imageUrl: row.featuredImageUrl,
        imageAlt: row.featuredImageAlt,
        html: row.body.includes("<") ? row.body : paragraphsFromText(row.body)
      };
    }
  }

  const posts = await fetchWp<WpPost[]>(
    `/posts?slug=${encodeURIComponent(slug)}&_embed=wp:featuredmedia`
  );
  const post = posts?.[0];

  if (!post) return null;

  return {
    ...wpToSummary(post),
    html: normalizeWordPressHtml(post.content.rendered ?? "")
  };
}

export async function getPageBySlug(slug: string): Promise<ContentDetail | null> {
  if (hasDatabase && db) {
    const row = await db.query.pages.findFirst({
      where: eq(pages.slug, slug)
    });

    if (row && row.status === "published") {
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        excerpt: stripHtml(row.body).slice(0, 240),
        date: row.createdAt.toISOString(),
        href: `/${row.slug}`,
        html: row.body
      };
    }
  }

  const rows = await fetchWp<WpPost[]>(
    `/pages?slug=${encodeURIComponent(slug)}&_embed=wp:featuredmedia`
  );
  const page = rows?.[0];

  if (!page) return null;

  return {
    ...wpToSummary(page),
    href: page.slug === "home" ? "/" : `/${page.slug}`,
    html: normalizeWordPressHtml(page.content.rendered ?? "")
  };
}

export async function getDirectoryEntries(limit = 24): Promise<DirectoryEntrySummary[]> {
  if (!hasDatabase || !db) return [];

  const rows = await db
    .select()
    .from(directoryEntries)
    .where(eq(directoryEntries.status, "approved"))
    .orderBy(desc(directoryEntries.createdAt))
    .limit(limit);

  return rows.map((entry) => ({
    id: entry.id,
    appName: entry.appName,
    slug: entry.slug,
    description: entry.description ?? "",
    status: entry.status,
    appStoreUrl: entry.appStoreUrl,
    websiteUrl: entry.websiteUrl,
    iconUrl: entry.iconUrl
  }));
}

export async function getLatestPodcastEpisodes(limit = 10): Promise<PodcastEpisodeSummary[]> {
  if (hasDatabase && db) {
    const rows = await db
      .select({
        id: podcastEpisodes.id,
        title: podcastEpisodes.title,
        slug: podcastEpisodes.slug,
        showNotes: podcastEpisodes.showNotes,
        enclosureUrl: podcastEpisodes.enclosureUrl,
        pubDate: podcastEpisodes.pubDate,
        showSlug: podcastShows.slug
      })
      .from(podcastEpisodes)
      .leftJoin(podcastShows, eq(podcastEpisodes.showId, podcastShows.id))
      .orderBy(desc(podcastEpisodes.pubDate))
      .limit(limit);

    if (rows.length > 0) {
      return rows.map((episode) => ({
        id: episode.id,
        title: episode.title,
        slug: episode.slug,
        date: episode.pubDate?.toISOString() ?? "",
        showNotes: stripHtml(episode.showNotes ?? "").slice(0, 260),
        enclosureUrl: episode.enclosureUrl
      }));
    }
  }

  const posts = await fetchWp<WpPost[]>(
    `/posts?search=${encodeURIComponent("iACast")}&per_page=${limit}`
  );

  return (posts ?? []).map((post) => ({
    id: post.id,
    title: decodeEntities(stripHtml(post.title.rendered ?? "Episode")),
    slug: post.slug,
    date: post.date,
    showNotes: decodeEntities(stripHtml(post.excerpt.rendered ?? "")).slice(0, 260)
  }));
}

export function dateLabel(date: string) {
  return formatDate(date);
}
