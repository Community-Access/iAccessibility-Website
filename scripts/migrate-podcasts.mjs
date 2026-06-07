// WordPress iACast podcast -> Neon migration.
//
// Imports the iACast podcast into `podcast_shows` + `podcast_episodes`.
// Per Taylor's direction (2026-06-07): import the iACast feed ONLY. The other
// five Captivate shows (SafetyCast, the language/"Spanish" shows, etc.) are left
// out until Michael gives direction on naming them.
//
// iACast spans two legacy sources, merged by slug into one show:
//   1) 229 modern Captivate episodes (Captivate show e0ece56d-...). Audio lives on
//      podcasts.captivate.fm (stable third party). Stable UUID guid + show notes.
//   2) 486 classic self-hosted episodes (regular wp-posts with an /iacast/*.mp3
//      enclosure). Audio is on the at-risk WP server; carries byte length + duration.
//   144 slugs overlap; the Captivate version wins (richer + stable audio), leaving
//   229 + 342 classic-only = ~571 unique episodes.
//
// Audio is NOT rehosted here — enclosure URLs are stored as-is (Captivate audio is
// already stable; classic mp3 rehosting is the separate media-rehost task).
//
// Idempotent: show upserts on slug; episodes upsert on guid. Re-running is safe.
//
// Usage:  node scripts/migrate-podcasts.mjs
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const EXPORT = "migration/wordpress-export";
const IACAST_CAPTIVATE_SHOW = "e0ece56d-dc1b-4a18-a283-ca21414b28e8";

const env = readFileSync(".env.local", "utf8");
const dbUrl = (env.match(/^DATABASE_URL=(.+)$/m) || [])[1]?.trim();
if (!dbUrl) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}
const sql = neon(dbUrl);

const meta = readFileSync(`${EXPORT}/postmeta-comments.sql`, "utf8");

// --- postmeta lookups (regex over the SQL dump; same approach as migrate-media) ---
function metaMap(key) {
  const map = new Map(); // wp post ID (string) -> value
  const re = new RegExp(`\\(\\d+,(\\d+),'${key}','((?:[^'\\\\]|\\\\.)*)'\\)`, "g");
  for (const m of meta.matchAll(re)) map.set(m[1], unescapeSql(m[2]));
  return map;
}
function unescapeSql(v) {
  return v.replace(/\\'/g, "'").replace(/\\"/g, '"');
}

const showIdByPost = metaMap("cfm_show_id");
const captivateGuidByPost = metaMap("cfm_episode_id");
const captivateUrlByPost = metaMap("cfm_episode_media_url");
const captivateArtByPost = metaMap("cfm_episode_artwork");
const enclosureByPost = metaMap("enclosure");

// iACast Network show cover (resolved from the iTunes Podcast API — "iACast Network"
// by The iACast Team, the flagship Captivate feed). Used as the per-episode artwork
// fallback for episodes with no Captivate episode artwork.
const SHOW_ART =
  "https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/2e/53/24/2e5324f0-26f8-dc59-8847-63f0e8cfe97e/mza_599773876741782187.png/600x600bb.jpg";

// --- helpers ---
function episodeNoFromTitle(title) {
  // First standalone integer (e.g. "#iACast 9 - ...", "192 - Bing My AI").
  const m = String(title).match(/^[^\d]*?(\d{1,4})\b/);
  return m ? Number(m[1]) : null;
}
function durationSeconds(rawEnclosure) {
  const m = rawEnclosure.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const c = m[3] != null ? Number(m[3]) : null;
  return c != null ? a * 3600 + b * 60 + c : a * 60 + b; // H:MM:SS or M:SS
}
function parseEnclosure(raw) {
  // "url\r\nbytes\r\nmime\r\na:1:{s:8:\"duration\";s:7:\"0:15:51\";}"
  const norm = raw.replace(/\\r/g, "").replace(/\\n/g, "\n");
  const [url, bytes, mime] = norm.split("\n");
  return {
    url: (url || "").trim(),
    byteLength: bytes && /^\d+$/.test(bytes.trim()) ? Number(bytes.trim()) : null,
    mime: (mime || "").trim() || null,
    durationSeconds: durationSeconds(raw)
  };
}
function pubDate(post) {
  const s = post.post_date_gmt || post.post_date;
  if (!s || s.startsWith("0000")) return null;
  return new Date(s.replace(" ", "T") + "Z");
}

// --- build the merged episode set, keyed by slug ---
const bySlug = new Map();

// 1) Captivate iACast episodes (authoritative on slug collision)
const legacy = JSON.parse(readFileSync(`${EXPORT}/wp-legacy-unregistered-posts.json`, "utf8"));
for (const p of legacy) {
  if (p.post_type !== "captivate_podcast") continue;
  if (showIdByPost.get(String(p.ID)) !== IACAST_CAPTIVATE_SHOW) continue;
  const slug = p.post_name;
  if (!slug) continue;
  bySlug.set(slug, {
    guid: captivateGuidByPost.get(String(p.ID)) || `iacast-captivate-${p.ID}`,
    title: p.post_title || "Untitled episode",
    slug,
    showNotes: p.post_content || null,
    transcript: null, // cfm_episode_transcript holds only upload-state metadata, no text
    pubDate: pubDate(p),
    enclosureUrl: captivateUrlByPost.get(String(p.ID)) || null,
    byteLength: null,
    mime: "audio/mpeg",
    durationSeconds: null,
    episodeNo: episodeNoFromTitle(p.post_title),
    imageUrl: captivateArtByPost.get(String(p.ID))?.trim() || null,
    legacyWpPostId: Number(p.ID)
  });
}
const captivateCount = bySlug.size;

// 2) Classic self-hosted iACast episodes (only slugs not already covered)
const posts = JSON.parse(readFileSync(`${EXPORT}/wp-posts.json`, "utf8"));
let classicAdded = 0;
for (const p of posts) {
  const raw = enclosureByPost.get(String(p.ID));
  if (!raw || !/\/iacast\//i.test(raw)) continue;
  const slug = p.post_name;
  if (!slug || bySlug.has(slug)) continue;
  const enc = parseEnclosure(raw);
  bySlug.set(slug, {
    guid: p.guid || `https://iaccessibility.net/?p=${p.ID}`,
    title: p.post_title || "Untitled episode",
    slug,
    showNotes: p.post_content || null,
    transcript: null,
    pubDate: pubDate(p),
    enclosureUrl: enc.url || null,
    byteLength: enc.byteLength,
    mime: enc.mime || "audio/mpeg",
    durationSeconds: enc.durationSeconds,
    episodeNo: episodeNoFromTitle(p.post_title),
    imageUrl: null, // classic episodes have no per-episode art; UI falls back to show art
    legacyWpPostId: Number(p.ID)
  });
  classicAdded += 1;
}

const episodes = [...bySlug.values()];
console.log(
  `iACast episodes: ${episodes.length} total ` +
    `(${captivateCount} Captivate + ${classicAdded} classic-only)`
);

// --- upsert the show ---
const [show] = await sql.query(
  `INSERT INTO podcast_shows (title, slug, description, author, owner_name, itunes_category, type, feed_slug, external_import_url, image_url)
   VALUES ($1,$2,$3,$4,$5,$6,'episodic',$7,$8,$9)
   ON CONFLICT (slug) DO UPDATE SET
     title = EXCLUDED.title,
     description = EXCLUDED.description,
     author = EXCLUDED.author,
     image_url = EXCLUDED.image_url,
     updated_at = now()
   RETURNING id`,
  [
    "iACast",
    "iacast",
    "The flagship iAccessibility podcast covering Apple accessibility, assistive technology, and the latest tech news for blind and low-vision users.",
    "iAccessibility",
    "iAccessibility",
    "Technology",
    "iacast",
    `https://feeds.captivate.fm/n/iacast-network/`,
    SHOW_ART
  ]
);
const showId = show.id;
console.log(`Show "iACast" id ${showId}`);

// --- upsert episodes ---
const COLS = [
  "show_id",
  "guid",
  "title",
  "slug",
  "show_notes",
  "transcript",
  "pub_date",
  "enclosure_url",
  "byte_length",
  "mime",
  "duration_seconds",
  "episode_no",
  "image_url",
  "legacy_wp_post_id"
];
function rowValues(e) {
  return [
    showId,
    e.guid,
    e.title,
    e.slug,
    e.showNotes,
    e.transcript,
    e.pubDate,
    e.enclosureUrl,
    e.byteLength,
    e.mime,
    e.durationSeconds,
    e.episodeNo,
    e.imageUrl,
    e.legacyWpPostId
  ];
}

const BATCH = 50;
let done = 0;
for (let i = 0; i < episodes.length; i += BATCH) {
  const slice = episodes.slice(i, i + BATCH);
  const params = [];
  const tuples = slice.map((e) => {
    const vals = rowValues(e);
    const ph = vals.map((v) => {
      params.push(v);
      return `$${params.length}`;
    });
    return `(${ph.join(",")})`;
  });
  await sql.query(
    `INSERT INTO podcast_episodes (${COLS.join(",")}) VALUES ${tuples.join(",")}
     ON CONFLICT (guid) DO UPDATE SET
       show_id = EXCLUDED.show_id,
       title = EXCLUDED.title,
       slug = EXCLUDED.slug,
       show_notes = EXCLUDED.show_notes,
       pub_date = EXCLUDED.pub_date,
       enclosure_url = EXCLUDED.enclosure_url,
       byte_length = EXCLUDED.byte_length,
       mime = EXCLUDED.mime,
       duration_seconds = EXCLUDED.duration_seconds,
       episode_no = EXCLUDED.episode_no,
       image_url = EXCLUDED.image_url,
       legacy_wp_post_id = EXCLUDED.legacy_wp_post_id,
       updated_at = now()`,
    params
  );
  done += slice.length;
  process.stdout.write(`\r  episodes: ${done}/${episodes.length}`);
}
process.stdout.write("\n");

const [{ count }] = await sql.query(
  "SELECT count(*)::int AS count FROM podcast_episodes WHERE show_id = $1",
  [showId]
);
const [{ count: withAudio }] = await sql.query(
  "SELECT count(*)::int AS count FROM podcast_episodes WHERE show_id = $1 AND enclosure_url IS NOT NULL",
  [showId]
);
console.log(`Done. iACast episodes in DB: ${count} (${withAudio} with audio URL)`);
