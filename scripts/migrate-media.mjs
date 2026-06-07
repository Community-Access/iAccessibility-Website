// WordPress media -> Neon migration.
//   1) Import attachments from wp-media.json into the `media` table.
//   2) Parse _thumbnail_id / _wp_attachment_image_alt from the postmeta SQL and
//      set blog_posts.featured_image_url / featured_image_alt for posts that had
//      a WordPress featured image.
// Idempotent: media upserts on `key`; post updates are deterministic.
//
// Usage:  node scripts/migrate-media.mjs
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const EXPORT = "migration/wordpress-export";
const env = readFileSync(".env.local", "utf8");
const dbUrl = (env.match(/^DATABASE_URL=(.+)$/m) || [])[1]?.trim();
if (!dbUrl) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}
const sql = neon(dbUrl);

// --- 1) media ---
const attachments = JSON.parse(readFileSync(`${EXPORT}/wp-media.json`, "utf8"));
const urlById = new Map(); // WP attachment ID (string) -> url
const mediaRows = [];
for (const m of attachments) {
  const url = m.guid;
  if (!url) continue;
  urlById.set(String(m.ID), url);
  mediaRows.push({
    key: `wp-${m.ID}`,
    url,
    mime: m.post_mime_type || null,
    alt: (m.post_title && String(m.post_title).trim()) || null
  });
}

async function importMedia() {
  const BATCH = 50;
  let done = 0;
  for (let i = 0; i < mediaRows.length; i += BATCH) {
    const slice = mediaRows.slice(i, i + BATCH);
    const params = [];
    const tuples = slice.map((r) => {
      const ph = ["key", "url", "mime", "alt"].map((c) => {
        params.push(r[c]);
        return `$${params.length}`;
      });
      return `(${ph.join(",")})`;
    });
    await sql.query(
      `INSERT INTO media (key,url,mime,alt) VALUES ${tuples.join(",")} ` +
        `ON CONFLICT (key) DO UPDATE SET url=EXCLUDED.url, mime=EXCLUDED.mime, alt=EXCLUDED.alt`,
      params
    );
    done += slice.length;
    process.stdout.write(`\r  media: ${done}/${mediaRows.length}`);
  }
  process.stdout.write("\n");
}

// --- 2) featured images from postmeta ---
const meta = readFileSync(`${EXPORT}/postmeta-comments.sql`, "utf8");

const thumbByPost = new Map(); // WP post ID -> attachment ID
for (const m of meta.matchAll(/\(\d+,(\d+),'_thumbnail_id','(\d+)'\)/g)) {
  thumbByPost.set(m[1], m[2]);
}
const altByAttachment = new Map(); // attachment post ID -> alt text
for (const m of meta.matchAll(
  /\(\d+,(\d+),'_wp_attachment_image_alt','((?:[^'\\]|\\.)*)'\)/g
)) {
  altByAttachment.set(m[1], m[2].replace(/\\'/g, "'").replace(/\\"/g, '"'));
}

const updates = [];
for (const [postId, attId] of thumbByPost) {
  const url = urlById.get(attId);
  if (!url) continue;
  updates.push({ postId: Number(postId), url, alt: altByAttachment.get(attId) || null });
}

async function applyFeatured() {
  const BATCH = 100;
  let done = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const slice = updates.slice(i, i + BATCH);
    const params = [];
    const tuples = slice.map((u) => {
      params.push(u.postId, u.url, u.alt);
      const n = params.length;
      return `($${n - 2}::int,$${n - 1},$${n})`;
    });
    await sql.query(
      `UPDATE blog_posts AS b
         SET featured_image_url = v.url,
             featured_image_alt = COALESCE(v.alt, b.featured_image_alt)
       FROM (VALUES ${tuples.join(",")}) AS v(post_id, url, alt)
       WHERE b.legacy_wp_post_id = v.post_id`,
      params
    );
    done += slice.length;
    process.stdout.write(`\r  featured: ${done}/${updates.length}`);
  }
  process.stdout.write("\n");
}

console.log(`Media to import: ${mediaRows.length}`);
console.log(`Posts with a WP featured image: ${updates.length}`);
await importMedia();
await applyFeatured();

const [{ count: mediaCount }] = await sql.query("SELECT count(*)::int AS count FROM media");
const [{ count: featuredCount }] = await sql.query(
  "SELECT count(*)::int AS count FROM blog_posts WHERE featured_image_url IS NOT NULL"
);
console.log(`\nDone. media rows: ${mediaCount}, posts with featured image: ${featuredCount}`);
