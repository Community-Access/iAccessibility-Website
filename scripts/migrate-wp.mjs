// One-off WordPress -> Neon content migration (posts + pages).
// Idempotent: upserts on legacy_wp_post_id, so it is safe to re-run.
// Reads the private export under migration/wordpress-export/ (gitignored).
//
// Usage:  node scripts/migrate-wp.mjs [--dry]
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const DRY = process.argv.includes("--dry");
const POSTS_ONLY = process.argv.includes("--posts-only");
const EXPORT = "migration/wordpress-export";

// --- load DATABASE_URL from .env.local ---
const env = readFileSync(".env.local", "utf8");
const dbUrl = (env.match(/^DATABASE_URL=(.+)$/m) || [])[1]?.trim();
if (!dbUrl) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}
const sql = neon(dbUrl);

// --- helpers ---
const STATUS = {
  publish: "published",
  future: "published",
  draft: "draft",
  pending: "pending",
  private: "draft"
};
function slugify(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}
function cleanHtml(html) {
  // strip Gutenberg block comment markers; keep the actual markup
  return (html || "").replace(/<!--\s*\/?wp:[^>]*?-->/g, "").trim();
}
function stripHtml(s) {
  return (s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function makeUniqueSlugger() {
  const seen = new Set();
  return (name, title, id) => {
    let base = (name && name.trim().toLowerCase()) || slugify(title) || `item-${id}`;
    base = base || `item-${id}`;
    let s = seen.has(base) ? `${base}-${id}` : base;
    seen.add(s);
    return s;
  };
}

async function batchUpsert(table, rows, columns, conflictCol) {
  if (!rows.length) return 0;
  const BATCH = 50;
  let done = 0;
  // build per-column cast hints for enum/timestamp
  const cast = (col) =>
    col === "status"
      ? "::content_status"
      : col === "published_at"
        ? "::timestamp"
        : "";
  const updates = columns
    .filter((c) => c !== conflictCol)
    .map((c) => `${c} = EXCLUDED.${c}`)
    .concat("updated_at = now()")
    .join(", ");

  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const params = [];
    const tuples = slice.map((row) => {
      const ph = columns.map((c) => {
        params.push(row[c]);
        return `$${params.length}${cast(c)}`;
      });
      return `(${ph.join(",")})`;
    });
    const text =
      `INSERT INTO ${table} (${columns.join(",")}) VALUES ${tuples.join(",")} ` +
      `ON CONFLICT (${conflictCol}) DO UPDATE SET ${updates}`;
    if (!DRY) await sql.query(text, params);
    done += slice.length;
    process.stdout.write(`\r  ${table}: ${done}/${rows.length}`);
  }
  process.stdout.write("\n");
  return done;
}

// --- author map (WP user ID -> display name) ---
const users = JSON.parse(readFileSync(`${EXPORT}/wp-users.json`, "utf8"));
// Note: user IDs are numbers but post_author is a string in this export.
const authorName = new Map(users.map((u) => [String(u.ID), u.display_name]));
// Use names only; skip rows where the display name looks like an email/login.
function cleanAuthor(id) {
  const name = authorName.get(String(id));
  if (!name || name.includes("@")) return null;
  return name;
}

// --- posts ---
const posts = JSON.parse(readFileSync(`${EXPORT}/wp-posts.json`, "utf8"));
const postSlug = makeUniqueSlugger();
const postRows = [];
let skippedPosts = 0;
for (const p of posts) {
  const status = STATUS[p.post_status];
  if (!status) {
    skippedPosts++;
    continue;
  }
  const body = cleanHtml(p.post_content) || "<p></p>";
  postRows.push({
    title: (p.post_title || "Untitled").slice(0, 500),
    slug: postSlug(p.post_name, p.post_title, p.ID),
    body,
    excerpt:
      (p.post_excerpt && stripHtml(p.post_excerpt)) ||
      stripHtml(p.post_content).slice(0, 240),
    author_name: cleanAuthor(p.post_author),
    status,
    published_at: p.post_date || null,
    legacy_wp_post_id: p.ID
  });
}

// --- pages ---
const pages = JSON.parse(readFileSync(`${EXPORT}/wp-pages.json`, "utf8"));
const pageSlug = makeUniqueSlugger();
const pageRows = [];
let skippedPages = 0;
for (const p of pages) {
  const status = STATUS[p.post_status];
  if (!status) {
    skippedPages++;
    continue;
  }
  pageRows.push({
    title: (p.post_title || "Untitled").slice(0, 500),
    slug: pageSlug(p.post_name, p.post_title, p.ID),
    body: cleanHtml(p.post_content) || "<p></p>",
    status,
    legacy_wp_post_id: p.ID
  });
}

console.log(
  `Posts: ${postRows.length} to import (${skippedPosts} skipped: trash/auto-draft/etc.)`
);
console.log(
  `Pages: ${pageRows.length} to import (${skippedPages} skipped)`
);
if (DRY) {
  console.log("DRY RUN — no writes. Sample post:", {
    title: postRows[0]?.title,
    slug: postRows[0]?.slug,
    status: postRows[0]?.status,
    legacy: postRows[0]?.legacy_wp_post_id
  });
  process.exit(0);
}

await batchUpsert(
  "blog_posts",
  postRows,
  [
    "title",
    "slug",
    "body",
    "excerpt",
    "author_name",
    "status",
    "published_at",
    "legacy_wp_post_id"
  ],
  "legacy_wp_post_id"
);
if (!POSTS_ONLY) {
  await batchUpsert(
    "pages",
    pageRows,
    ["title", "slug", "body", "status", "legacy_wp_post_id"],
    "legacy_wp_post_id"
  );
} else {
  console.log("  pages: skipped (--posts-only)");
}

const [{ count: postCount }] = await sql.query(
  "SELECT count(*)::int AS count FROM blog_posts WHERE legacy_wp_post_id IS NOT NULL"
);
console.log(`\nDone. blog_posts (migrated): ${postCount}`);
