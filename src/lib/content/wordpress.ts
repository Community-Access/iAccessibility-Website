import { asc, desc, eq, inArray } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import {
  blogCategories,
  blogPosts,
  directoryCategories,
  directoryEntries,
  directoryEntryCategories,
  pages,
  podcastEpisodes,
  podcastShows,
  postCategories
} from "@/db/schema";
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
  accessibilityRating?: string | null;
  platforms: string[];
  categories: string[];
};

export type DirectoryFacets = {
  platforms: string[];
  categories: string[];
  ratings: string[];
};

// Platform prefixes used by the migrated "Platform: Category" directory taxonomy.
const KNOWN_DIRECTORY_PLATFORMS = new Set([
  "iOS",
  "iPadOS",
  "macOS",
  "watchOS",
  "tvOS",
  "visionOS",
  "Windows",
  "Android",
  "Linux"
]);

export type DirectoryCategorySummary = {
  id: number | string;
  name: string;
  slug: string;
  description?: string | null;
};

export type PodcastEpisodeSummary = {
  id: number;
  title: string;
  slug: string;
  date: string;
  showNotes: string;
  enclosureUrl?: string | null;
  image?: string | null;
  durationSeconds?: number | null;
  episodeNo?: number | null;
};

export type PodcastEpisodeDetail = {
  id: number;
  title: string;
  slug: string;
  date: string;
  bodyHtml: string;
  enclosureUrl?: string | null;
  image?: string | null;
  durationSeconds?: number | null;
  episodeNo?: number | null;
  byteLength?: number | null;
  showTitle: string;
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

const DIRECTORY_ACCESSIBILITY_RATINGS = [
  "5 - Fully Accessible",
  "4 - Mostly Accessible",
  "3 - Average",
  "2 - Needs Work",
  "1 - Not Accessible"
];

function directoryRatingForScore(score: string | number) {
  return (
    DIRECTORY_ACCESSIBILITY_RATINGS.find((rating) =>
      rating.startsWith(`${score} -`)
    ) ?? null
  );
}

function decodeEntities(value: string) {
  return value
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
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

function imageAttribute(tag: string, name: string) {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")
  );
  return decodeEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
}

function largestSrcFromSrcset(srcset: string) {
  const candidates = srcset
    .split(",")
    .map((part) => {
      const [url, descriptor] = part.trim().split(/\s+/, 2);
      const width = Number(descriptor?.replace("w", "")) || 0;
      return { url, width };
    })
    .filter((candidate) => candidate.url);

  return candidates.sort((a, b) => b.width - a.width)[0]?.url ?? "";
}

function absoluteWordPressImageUrl(src: string) {
  if (!src || src.startsWith("data:")) return "";
  if (src.startsWith("//")) return `https:${src}`;
  if (src.startsWith("/")) return `${WORDPRESS_ORIGIN}${src}`;
  return src;
}

function firstImageFromHtml(html: string) {
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const src =
      imageAttribute(tag, "data-orig-file") ||
      largestSrcFromSrcset(imageAttribute(tag, "srcset")) ||
      imageAttribute(tag, "src");
    const resolved = absoluteWordPressImageUrl(src);
    if (!resolved) continue;

    return {
      src: resolved,
      alt: imageAttribute(tag, "alt") || null
    };
  }

  return null;
}

function removeFirstImageBlock(html: string) {
  return html
    .replace(
      /<figure\b[^>]*>\s*(?:<a\b[^>]*>)?\s*<img\b[\s\S]*?(?:<\/a>)?\s*(?:<figcaption\b[\s\S]*?<\/figcaption>)?\s*<\/figure>/i,
      ""
    )
    .replace(/<p>\s*(?:<a\b[^>]*>)?\s*<img\b[\s\S]*?(?:<\/a>)?\s*<\/p>/i, "")
    .replace(/<img\b[^>]*>/i, "");
}

function wpToSummary(post: WpPost): ContentSummary {
  const image = post._embedded?.["wp:featuredmedia"]?.[0];
  const bodyImage = firstImageFromHtml(post.content.rendered ?? "");

  return {
    id: post.id,
    title: decodeEntities(stripHtml(post.title.rendered ?? "Untitled")),
    slug: post.slug,
    excerpt: decodeEntities(stripHtml(post.excerpt.rendered ?? "")).slice(0, 240),
    date: post.date,
    href: `/blog/${post.slug}`,
    imageUrl: image?.source_url ?? bodyImage?.src ?? null,
    imageAlt: image?.alt_text ?? bodyImage?.alt ?? null
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

type DbPostRow = typeof blogPosts.$inferSelect;

function dbPostToSummary(post: DbPostRow): ContentSummary {
  const bodyImage = firstImageFromHtml(post.body);

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? stripHtml(post.body).slice(0, 240),
    date: post.publishedAt?.toISOString() ?? post.createdAt.toISOString(),
    href: `/blog/${post.slug}`,
    author: post.authorName,
    imageUrl: post.featuredImageUrl ?? bodyImage?.src ?? null,
    imageAlt: post.featuredImageAlt ?? bodyImage?.alt ?? null
  };
}

async function getDirectoryCategorySlugSet() {
  if (!hasDatabase || !db) return new Set<string>();

  const rows = await db
    .select({ slug: directoryCategories.slug })
    .from(directoryCategories);

  return new Set(rows.map((row) => row.slug));
}

async function filterDirectoryPosts<T extends { id: number }>(rows: T[]) {
  if (!hasDatabase || !db || rows.length === 0) return rows;

  const directorySlugs = await getDirectoryCategorySlugSet();
  if (directorySlugs.size === 0) return rows;

  const categoryRows = await db
    .select({
      postId: postCategories.postId,
      slug: blogCategories.slug
    })
    .from(postCategories)
    .innerJoin(blogCategories, eq(postCategories.categoryId, blogCategories.id))
    .where(inArray(postCategories.postId, rows.map((row) => row.id)));

  const directoryPostIds = new Set(
    categoryRows
      .filter((row) => directorySlugs.has(row.slug))
      .map((row) => row.postId)
  );

  return rows.filter((row) => !directoryPostIds.has(row.id));
}

export async function getLatestPosts(limit = 8): Promise<ContentSummary[]> {
  if (hasDatabase && db) {
    const rows = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(5000);

    if (rows.length > 0) {
      const filtered = await filterDirectoryPosts(rows);
      return filtered.slice(0, limit).map(dbPostToSummary);
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
    const rows = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(5000);

    if (rows.length > 0) {
      const filtered = await filterDirectoryPosts(rows);
      const total = filtered.length;
      const offset = (safePage - 1) * perPage;

      return {
        posts: filtered.slice(offset, offset + perPage).map(dbPostToSummary),
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
      const bodyImage = firstImageFromHtml(row.body);
      const usesBodyImage = !row.featuredImageUrl && Boolean(bodyImage?.src);
      const body = usesBodyImage ? removeFirstImageBlock(row.body) : row.body;

      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt ?? stripHtml(row.body).slice(0, 240),
        date: row.publishedAt?.toISOString() ?? row.createdAt.toISOString(),
        href: `/blog/${row.slug}`,
        author: row.authorName,
        imageUrl: row.featuredImageUrl ?? bodyImage?.src ?? null,
        imageAlt: row.featuredImageAlt ?? bodyImage?.alt ?? null,
        html: body.includes("<") ? body : paragraphsFromText(body)
      };
    }
  }

  const posts = await fetchWp<WpPost[]>(
    `/posts?slug=${encodeURIComponent(slug)}&_embed=wp:featuredmedia`
  );
  const post = posts?.[0];

  if (!post) return null;

  const bodyImage = firstImageFromHtml(post.content.rendered ?? "");
  const hasFeaturedImage = Boolean(
    post._embedded?.["wp:featuredmedia"]?.[0]?.source_url
  );
  const summary = wpToSummary(post);
  const html = !hasFeaturedImage && bodyImage?.src
    ? removeFirstImageBlock(post.content.rendered ?? "")
    : post.content.rendered ?? "";

  return {
    ...summary,
    html: normalizeWordPressHtml(html)
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

// Splits a migrated directory category name into its platform + category parts.
// "iOS: Books" -> { platform: "iOS", category: "Books" }
// "Screen Readers" -> { platform: null, category: "Screen Readers" }
// "iOS App Directory" (a root term) -> { platform: null, category: null }
function splitDirectoryCategoryName(name: string): {
  platform: string | null;
  category: string | null;
} {
  const colon = name.indexOf(":");
  if (colon > -1) {
    const platform = name.slice(0, colon).trim();
    const category = name.slice(colon + 1).trim();
    const knownPlatform = KNOWN_DIRECTORY_PLATFORMS.has(platform)
      ? platform
      : null;
    if (directoryAccessibilityRatingFromCategory(category)) {
      return { platform: knownPlatform, category: null };
    }
    return {
      platform: knownPlatform,
      category: category || null
    };
  }
  if (directoryAccessibilityRatingFromCategory(name)) {
    return { platform: null, category: null };
  }
  // Base categories without a platform prefix; ignore the "… App Directory" roots.
  if (/\bApp Directory$/i.test(name)) return { platform: null, category: null };
  return { platform: null, category: name.trim() || null };
}

function directoryAccessibilityRatingFromCategory(name: string) {
  const category = name.includes(":") ? name.split(":").pop() ?? name : name;
  const match = category.trim().match(/^([1-5])\s+stars?$/i);
  return match ? directoryRatingForScore(match[1]) : null;
}

function directoryAccessibilityRating(description: string | null) {
  const text = decodeEntities(
    stripHtml(
      (description ?? "")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<\/p>/gi, " ")
    )
  )
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const markerIndex = text.search(/accessibility\s+rating\s*:?/);
  if (markerIndex === -1) return null;

  const ratingText = text.slice(markerIndex);
  const scoreMatch = ratingText.match(/accessibility\s+rating\s*:?\s*([1-5])\b/);
  const scoreRating = scoreMatch ? directoryRatingForScore(scoreMatch[1]) : null;
  return (
    scoreRating ??
    DIRECTORY_ACCESSIBILITY_RATINGS.find((rating) =>
      ratingText.includes(rating.toLowerCase())
    ) ??
    null
  );
}

export async function getDirectoryEntries(): Promise<DirectoryEntrySummary[]> {
  if (!hasDatabase || !db) return [];

  const rows = await db
    .select()
    .from(directoryEntries)
    .where(eq(directoryEntries.status, "approved"))
    .orderBy(asc(directoryEntries.appName));

  if (rows.length === 0) return [];

  const links = await db
    .select({
      entryId: directoryEntryCategories.entryId,
      name: directoryCategories.name
    })
    .from(directoryEntryCategories)
    .innerJoin(
      directoryCategories,
      eq(directoryEntryCategories.categoryId, directoryCategories.id)
    )
    .where(
      inArray(
        directoryEntryCategories.entryId,
        rows.map((row) => row.id)
      )
    );

  const facetsByEntry = new Map<
    number,
    {
      platforms: Set<string>;
      categories: Set<string>;
      ratings: Set<string>;
    }
  >();
  for (const link of links) {
    const bucket =
      facetsByEntry.get(link.entryId) ??
      {
        platforms: new Set<string>(),
        categories: new Set<string>(),
        ratings: new Set<string>()
      };
    const rating = directoryAccessibilityRatingFromCategory(link.name);
    if (rating) bucket.ratings.add(rating);
    const { platform, category } = splitDirectoryCategoryName(link.name);
    if (platform) bucket.platforms.add(platform);
    if (category) bucket.categories.add(category);
    facetsByEntry.set(link.entryId, bucket);
  }

  return rows.map((entry) => {
    const bucket = facetsByEntry.get(entry.id);
    const taxonomyRating = DIRECTORY_ACCESSIBILITY_RATINGS.find((rating) =>
      bucket?.ratings.has(rating)
    );
    return {
      id: entry.id,
      appName: entry.appName,
      slug: entry.slug,
      description: entry.description ?? "",
      status: entry.status,
      appStoreUrl: entry.appStoreUrl,
      websiteUrl: entry.websiteUrl,
      iconUrl: entry.iconUrl,
      accessibilityRating:
        directoryAccessibilityRating(entry.description) ?? taxonomyRating ?? null,
      platforms: bucket ? Array.from(bucket.platforms).sort() : [],
      categories: bucket ? Array.from(bucket.categories).sort() : []
    };
  });
}

// Distinct platform + category facets present across the approved entries,
// for building the directory filter controls.
export function deriveDirectoryFacets(
  entries: DirectoryEntrySummary[]
): DirectoryFacets {
  const platforms = new Set<string>();
  const categories = new Set<string>();
  const ratings = new Set<string>();
  for (const entry of entries) {
    entry.platforms.forEach((platform) => platforms.add(platform));
    entry.categories.forEach((category) => categories.add(category));
    if (entry.accessibilityRating) ratings.add(entry.accessibilityRating);
  }
  return {
    platforms: Array.from(platforms).sort(),
    categories: Array.from(categories).sort((a, b) => a.localeCompare(b)),
    ratings: Array.from(ratings).sort((a, b) => a.localeCompare(b))
  };
}

export async function getDirectoryCategories(): Promise<DirectoryCategorySummary[]> {
  if (hasDatabase && db) {
    const rows = await db
      .select({
        id: directoryCategories.id,
        name: directoryCategories.name,
        slug: directoryCategories.slug
      })
      .from(directoryCategories)
      .orderBy(asc(directoryCategories.name));

    if (rows.length > 0) {
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: null
      }));
    }
  }

  return DIRECTORY_CATEGORIES.map((name) => ({
    id: name,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    description: null
  }));
}

const podcastSummarySelection = {
  id: podcastEpisodes.id,
  title: podcastEpisodes.title,
  slug: podcastEpisodes.slug,
  showNotes: podcastEpisodes.showNotes,
  enclosureUrl: podcastEpisodes.enclosureUrl,
  pubDate: podcastEpisodes.pubDate,
  durationSeconds: podcastEpisodes.durationSeconds,
  episodeNo: podcastEpisodes.episodeNo,
  episodeImage: podcastEpisodes.imageUrl,
  showImage: podcastShows.imageUrl
};

type PodcastSummaryRow = {
  id: number;
  title: string;
  slug: string;
  showNotes: string | null;
  enclosureUrl: string | null;
  pubDate: Date | null;
  durationSeconds: number | null;
  episodeNo: number | null;
  episodeImage: string | null;
  showImage: string | null;
};

function toPodcastSummary(episode: PodcastSummaryRow): PodcastEpisodeSummary {
  return {
    id: episode.id,
    title: episode.title,
    slug: episode.slug,
    date: episode.pubDate?.toISOString() ?? "",
    showNotes: stripHtml(episode.showNotes ?? "").slice(0, 220),
    enclosureUrl: episode.enclosureUrl,
    image: episode.episodeImage ?? episode.showImage ?? null,
    durationSeconds: episode.durationSeconds,
    episodeNo: episode.episodeNo
  };
}

export async function getLatestPodcastEpisodes(limit = 10): Promise<PodcastEpisodeSummary[]> {
  if (hasDatabase && db) {
    const rows = await db
      .select(podcastSummarySelection)
      .from(podcastEpisodes)
      .leftJoin(podcastShows, eq(podcastEpisodes.showId, podcastShows.id))
      .orderBy(desc(podcastEpisodes.pubDate))
      .limit(limit);

    if (rows.length > 0) {
      return rows.map(toPodcastSummary);
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
    showNotes: decodeEntities(stripHtml(post.excerpt.rendered ?? "")).slice(0, 220)
  }));
}

// All iACast episodes, newest first, for the browse page (client-side
// search + pagination, mirroring the App Directory pattern).
export async function getPodcastEpisodes(): Promise<PodcastEpisodeSummary[]> {
  if (!hasDatabase || !db) return [];
  const rows = await db
    .select(podcastSummarySelection)
    .from(podcastEpisodes)
    .leftJoin(podcastShows, eq(podcastEpisodes.showId, podcastShows.id))
    .orderBy(desc(podcastEpisodes.pubDate));
  return rows.map(toPodcastSummary);
}

export async function getPodcastEpisodeBySlug(
  slug: string
): Promise<PodcastEpisodeDetail | null> {
  if (!hasDatabase || !db) return null;
  const [episode] = await db
    .select({
      id: podcastEpisodes.id,
      title: podcastEpisodes.title,
      slug: podcastEpisodes.slug,
      showNotes: podcastEpisodes.showNotes,
      enclosureUrl: podcastEpisodes.enclosureUrl,
      pubDate: podcastEpisodes.pubDate,
      durationSeconds: podcastEpisodes.durationSeconds,
      episodeNo: podcastEpisodes.episodeNo,
      byteLength: podcastEpisodes.byteLength,
      episodeImage: podcastEpisodes.imageUrl,
      showImage: podcastShows.imageUrl,
      showTitle: podcastShows.title
    })
    .from(podcastEpisodes)
    .leftJoin(podcastShows, eq(podcastEpisodes.showId, podcastShows.id))
    .where(eq(podcastEpisodes.slug, slug))
    .limit(1);

  if (!episode) return null;

  return {
    id: episode.id,
    title: episode.title,
    slug: episode.slug,
    date: episode.pubDate?.toISOString() ?? "",
    bodyHtml: episode.showNotes ?? "",
    enclosureUrl: episode.enclosureUrl,
    image: episode.episodeImage ?? episode.showImage ?? null,
    durationSeconds: episode.durationSeconds,
    episodeNo: episode.episodeNo,
    byteLength: episode.byteLength,
    showTitle: episode.showTitle ?? "iACast"
  };
}

export function dateLabel(date: string) {
  return formatDate(date);
}
