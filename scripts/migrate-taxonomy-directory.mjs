// WordPress taxonomy + app directory -> Neon migration.
// Idempotent and schema-preserving:
//   1) Imports WordPress categories/tags and post relationships.
//   2) Imports WordPress App Directory categories into directory_categories.
//   3) Imports App Directory posts into directory_entries with icons when available.
//
// Usage:
//   node scripts/migrate-taxonomy-directory.mjs --dry
//   node scripts/migrate-taxonomy-directory.mjs
import { existsSync, readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const DRY = process.argv.includes("--dry");
const EXPORT = "migration/wordpress-export";
const ROOT_SLUGS = [
  "ios-app-directory",
  "macos-app-directory",
  "windows-app-directory",
  "watchos-app-directory",
  "tvos-app-directory",
  "visionos-app-directory",
  "android-app-directory",
  "directory",
  "appdirectory"
];
const STATUS = {
  publish: "approved",
  future: "approved",
  pending: "pending",
  draft: "pending",
  private: "pending"
};

function slugify(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function stripHtml(value) {
  return (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function cleanHtml(value) {
  return (value || "").replace(/<!--\s*\/?wp:[^>]*?-->/g, "").trim();
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function makeUniqueSlugger() {
  const seen = new Set();
  return (preferred, title, id) => {
    const base = preferred || slugify(title) || `item-${id}`;
    const slug = seen.has(base) ? `${base}-${id}` : base;
    seen.add(slug);
    return slug;
  };
}

function insertBody(sql, table) {
  const marker = `INSERT INTO \`${table}\` VALUES`;
  const start = sql.indexOf(marker);
  if (start < 0) return "";
  const valuesStart = sql.indexOf("\n", start) + 1;
  const end = sql.indexOf(";\n", valuesStart);
  return sql.slice(valuesStart, end);
}

function decodeSqlEscape(char) {
  if (char === "n") return "\n";
  if (char === "r") return "\r";
  if (char === "t") return "\t";
  return char;
}

function normalizeSqlValue(value) {
  const trimmed = value.trim();
  return trimmed === "NULL" ? null : trimmed;
}

function parseTuples(body) {
  const rows = [];
  let row = [];
  let value = "";
  let inRow = false;
  let inQuote = false;
  let escaping = false;

  for (const char of body) {
    if (!inRow) {
      if (char === "(") {
        inRow = true;
        row = [];
        value = "";
      }
      continue;
    }

    if (inQuote) {
      if (escaping) {
        value += decodeSqlEscape(char);
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === "'") {
        inQuote = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === "'") {
      inQuote = true;
    } else if (char === ",") {
      row.push(normalizeSqlValue(value));
      value = "";
    } else if (char === ")") {
      row.push(normalizeSqlValue(value));
      rows.push(row);
      inRow = false;
      value = "";
    } else {
      value += char;
    }
  }

  return rows;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function extractLinks(html) {
  return Array.from((html || "").matchAll(/https?:\/\/[^\s"'<>]+/g))
    .map((match) => match[0].replace(/[),.]+$/, ""))
    .filter((url, index, urls) => urls.indexOf(url) === index);
}

function isStoreUrl(url) {
  return /apps\.apple\.com|itunes\.apple\.com|play\.google\.com|apps\.microsoft\.com|microsoft\.com\/store/i.test(
    url
  );
}

function appStoreIdFromUrl(url) {
  return url?.match(/\/id(\d+)/i)?.[1] || url?.match(/[?&]id=(\d+)/i)?.[1] || null;
}

function rootLabel(rootTerm) {
  return rootTerm.name.replace(/\s+App Directory$/i, "") || rootTerm.name;
}

function directoryCategoryName(term, rootTerm) {
  if (term.id === rootTerm.id) return term.name;
  if (rootTerm.slug === "directory" || rootTerm.slug === "appdirectory") {
    return term.name;
  }
  return `${rootLabel(rootTerm)}: ${term.name}`;
}

function batchRows(rows, size = 50) {
  const batches = [];
  for (let i = 0; i < rows.length; i += size) batches.push(rows.slice(i, i + size));
  return batches;
}

async function batchUpsert(sql, table, rows, columns, conflictCol) {
  if (!rows.length) return;
  if (!columns.includes(conflictCol)) {
    throw new Error(`${table}.${conflictCol} is required for upsert.`);
  }
  let done = 0;
  const cast = (column) =>
    table === "directory_entries" && column === "status"
      ? "::directory_status"
      : column === "created_at" || column === "updated_at"
        ? "::timestamp"
        : "";
  const updates = columns
    .filter((column) => column !== conflictCol)
    .map((column) => `${column}=EXCLUDED.${column}`)
    .join(", ");

  for (const slice of batchRows(rows)) {
    const params = [];
    const tuples = slice.map((row) => {
      const values = columns.map((column) => {
        params.push(row[column]);
        return `$${params.length}${cast(column)}`;
      });
      return `(${values.join(",")})`;
    });
    await sql.query(
      `INSERT INTO ${table} (${columns.join(",")}) VALUES ${tuples.join(",")} ` +
        `ON CONFLICT (${conflictCol}) DO UPDATE SET ${updates}`,
      params
    );
    done += slice.length;
    process.stdout.write(`\r  ${table}: ${done}/${rows.length}`);
  }
  process.stdout.write("\n");
}

async function tableColumnSet(sql, table) {
  const rows = await sql.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1`,
    [table]
  );
  return new Set(rows.map((row) => row.column_name));
}

function availableColumns(table, desiredColumns, columnSet) {
  const columns = desiredColumns.filter((column) => columnSet.has(column));
  const missing = desiredColumns.filter((column) => !columnSet.has(column));

  if (missing.length > 0) {
    console.log(`  ${table}: skipping missing column(s): ${missing.join(", ")}`);
  }

  return columns;
}

async function batchInsertPairs(sql, table, leftCol, rightCol, pairs) {
  const unique = uniqueBy(pairs, (pair) => `${pair[leftCol]}:${pair[rightCol]}`);
  if (!unique.length) return;
  let done = 0;

  for (const slice of batchRows(unique, 200)) {
    const params = [];
    const tuples = slice.map((pair) => {
      params.push(pair[leftCol], pair[rightCol]);
      const index = params.length;
      return `($${index - 1}::int,$${index}::int)`;
    });
    await sql.query(
      `INSERT INTO ${table} (${leftCol}, ${rightCol}) VALUES ${tuples.join(",")} ` +
        "ON CONFLICT DO NOTHING",
      params
    );
    done += slice.length;
    process.stdout.write(`\r  ${table}: ${done}/${unique.length}`);
  }
  process.stdout.write("\n");
}

const taxonomySql = readFileSync(`${EXPORT}/taxonomy.sql`, "utf8");
const postmetaSql = readFileSync(`${EXPORT}/postmeta-comments.sql`, "utf8");
const posts = readJson(`${EXPORT}/wp-posts.json`);
const portfolio = existsSync(`${EXPORT}/wp-jetpack-portfolio.json`)
  ? readJson(`${EXPORT}/wp-jetpack-portfolio.json`)
  : [];
const media = readJson(`${EXPORT}/wp-media.json`);

const terms = new Map(
  parseTuples(insertBody(taxonomySql, "wpys_terms")).map((row) => [
    Number(row[0]),
    { id: Number(row[0]), name: row[1] || "", slug: row[2] || "" }
  ])
);
const taxonomies = parseTuples(insertBody(taxonomySql, "wpys_term_taxonomy")).map(
  (row) => ({
    id: Number(row[0]),
    termId: Number(row[1]),
    taxonomy: row[2],
    description: row[3] || null,
    parent: Number(row[4] || 0),
    count: Number(row[5] || 0)
  })
);
const relationships = parseTuples(insertBody(taxonomySql, "wpys_term_relationships")).map(
  (row) => ({
    objectId: Number(row[0]),
    termTaxonomyId: Number(row[1])
  })
);

const taxonomyById = new Map(taxonomies.map((item) => [item.id, item]));
const categoryTaxonomies = taxonomies.filter((item) => item.taxonomy === "category");
const tagTaxonomies = taxonomies.filter((item) => item.taxonomy === "post_tag");
const categoryByTermId = new Map(categoryTaxonomies.map((item) => [item.termId, item]));
const tagByTermId = new Map(tagTaxonomies.map((item) => [item.termId, item]));
const childrenByParent = new Map();

for (const item of categoryTaxonomies) {
  const children = childrenByParent.get(item.parent) || [];
  children.push(item.termId);
  childrenByParent.set(item.parent, children);
}

const rootForTerm = new Map();
for (const slug of ROOT_SLUGS) {
  const rootTerm = Array.from(terms.values()).find((term) => term.slug === slug);
  if (!rootTerm || !categoryByTermId.has(rootTerm.id)) continue;
  const queue = [rootTerm.id];
  while (queue.length) {
    const termId = queue.shift();
    if (!rootForTerm.has(termId)) rootForTerm.set(termId, rootTerm.id);
    queue.push(...(childrenByParent.get(termId) || []));
  }
}

const appTermIds = new Set(rootForTerm.keys());
const appTermTaxonomyIds = new Set(
  categoryTaxonomies
    .filter((item) => appTermIds.has(item.termId))
    .map((item) => item.id)
);
const postIdSet = new Set(posts.map((post) => Number(post.ID)));
const postToTaxonomyIds = new Map();

for (const relationship of relationships) {
  if (!postIdSet.has(relationship.objectId)) continue;
  const list = postToTaxonomyIds.get(relationship.objectId) || [];
  list.push(relationship.termTaxonomyId);
  postToTaxonomyIds.set(relationship.objectId, list);
}

const blogCategoryRows = uniqueBy(
  categoryTaxonomies
    .map((item) => {
      const term = terms.get(item.termId);
      if (!term) return null;
      return { name: term.name, slug: term.slug, description: item.description };
    })
    .filter(Boolean),
  (row) => row.slug
);
const tagRows = uniqueBy(
  tagTaxonomies
    .map((item) => {
      const term = terms.get(item.termId);
      if (!term) return null;
      return { name: term.name, slug: term.slug };
    })
    .filter(Boolean),
  (row) => row.slug
);

const postCategoryLinks = [];
const postTagLinks = [];
for (const [wpPostId, taxonomyIds] of postToTaxonomyIds) {
  for (const taxonomyId of taxonomyIds) {
    const taxonomy = taxonomyById.get(taxonomyId);
    const term = taxonomy ? terms.get(taxonomy.termId) : null;
    if (!taxonomy || !term) continue;
    if (taxonomy.taxonomy === "category") {
      postCategoryLinks.push({ wpPostId, slug: term.slug });
    } else if (taxonomy.taxonomy === "post_tag") {
      postTagLinks.push({ wpPostId, slug: term.slug });
    }
  }
}

const directoryCategoryRows = uniqueBy(
  Array.from(appTermIds)
    .map((termId) => {
      const term = terms.get(termId);
      const root = terms.get(rootForTerm.get(termId));
      const taxonomy = categoryByTermId.get(termId);
      if (!term || !root) return null;
      return {
        name: directoryCategoryName(term, root),
        slug: term.slug,
        description:
          taxonomy?.description ||
          `Imported from the WordPress ${root.name} category tree.`
      };
    })
    .filter(Boolean),
  (row) => row.slug
);

const urlByMediaId = new Map(media.map((item) => [String(item.ID), item.guid]));
const thumbByPost = new Map();
for (const match of postmetaSql.matchAll(/\(\d+,(\d+),'_thumbnail_id','(\d+)'\)/g)) {
  thumbByPost.set(match[1], match[2]);
}
const altByAttachment = new Map();
for (const match of postmetaSql.matchAll(
  /\(\d+,(\d+),'_wp_attachment_image_alt','((?:[^'\\]|\\.)*)'\)/g
)) {
  altByAttachment.set(match[1], match[2].replace(/\\'/g, "'").replace(/\\"/g, '"'));
}

const directoryPostIds = new Set(
  Array.from(postToTaxonomyIds.entries())
    .filter(([, taxonomyIds]) =>
      taxonomyIds.some((taxonomyId) => appTermTaxonomyIds.has(taxonomyId))
    )
    .map(([wpPostId]) => wpPostId)
);
const directorySlug = makeUniqueSlugger();
const directoryRows = [];
const directoryTermLinks = [];

for (const post of posts.filter((item) => directoryPostIds.has(Number(item.ID)))) {
  const status = STATUS[post.post_status];
  if (!status) continue;

  const links = extractLinks(post.post_content);
  const appStoreUrl = links.find(isStoreUrl) || null;
  const websiteUrl = links.find((url) => url !== appStoreUrl && !/iaccessibility\.net/i.test(url)) || null;
  const thumbId = thumbByPost.get(String(post.ID));
  const iconUrl = thumbId ? urlByMediaId.get(thumbId) || null : null;
  const description =
    stripHtml(post.post_excerpt) ||
    stripHtml(post.post_content).slice(0, 600) ||
    null;

  directoryRows.push({
    app_name: (post.post_title || "Untitled app").slice(0, 500),
    slug: directorySlug(post.post_name, post.post_title, post.ID),
    description,
    icon_url: iconUrl,
    app_store_url: appStoreUrl,
    itunes_app_id: appStoreIdFromUrl(appStoreUrl),
    website_url: websiteUrl,
    status,
    created_at: post.post_date || null,
    updated_at: post.post_modified || post.post_date || null,
    legacy_wp_post_id: Number(post.ID)
  });

  for (const taxonomyId of postToTaxonomyIds.get(Number(post.ID)) || []) {
    const taxonomy = taxonomyById.get(taxonomyId);
    const term = taxonomy ? terms.get(taxonomy.termId) : null;
    if (term && appTermIds.has(term.id)) {
      directoryTermLinks.push({ wpPostId: Number(post.ID), slug: term.slug });
    }
  }
}

for (const post of portfolio) {
  const status = STATUS[post.post_status];
  if (!status) continue;
  directoryRows.push({
    app_name: (post.post_title || "Untitled app").slice(0, 500),
    slug: directorySlug(post.post_name, post.post_title, post.ID),
    description: stripHtml(post.post_excerpt) || stripHtml(post.post_content) || null,
    icon_url: null,
    app_store_url: null,
    itunes_app_id: null,
    website_url: null,
    status,
    created_at: post.post_date || null,
    updated_at: post.post_modified || post.post_date || null,
    legacy_wp_post_id: Number(post.ID)
  });
}

console.log("WordPress taxonomy analysis");
console.log(`  blog categories: ${blogCategoryRows.length}`);
console.log(`  tags: ${tagRows.length}`);
console.log(`  post-category links: ${postCategoryLinks.length}`);
console.log(`  post-tag links: ${postTagLinks.length}`);
console.log(`  directory categories: ${directoryCategoryRows.length}`);
console.log(`  directory entries: ${directoryRows.length}`);
console.log(`  directory entry-category links: ${directoryTermLinks.length}`);
console.log("  sample directory entries:");
for (const sample of directoryRows.slice(0, 5)) {
  console.log(`    - ${sample.app_name} (${sample.slug})`);
}

if (DRY) {
  console.log("Dry run: no database writes.");
  process.exit(0);
}

const env = readFileSync(".env.local", "utf8");
const dbUrl = (env.match(/^DATABASE_URL=(.+)$/m) || [])[1]?.trim();
if (!dbUrl) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}
const sql = neon(dbUrl);
const liveColumns = {
  blog_categories: await tableColumnSet(sql, "blog_categories"),
  tags: await tableColumnSet(sql, "tags"),
  directory_categories: await tableColumnSet(sql, "directory_categories"),
  directory_entries: await tableColumnSet(sql, "directory_entries")
};
const blogCategoryColumns = availableColumns(
  "blog_categories",
  ["name", "slug", "description"],
  liveColumns.blog_categories
);
const tagColumns = availableColumns("tags", ["name", "slug"], liveColumns.tags);
const directoryCategoryColumns = availableColumns(
  "directory_categories",
  ["name", "slug", "description"],
  liveColumns.directory_categories
);
const directoryEntryColumns = availableColumns(
  "directory_entries",
  [
    "app_name",
    "slug",
    "description",
    "icon_url",
    "app_store_url",
    "itunes_app_id",
    "website_url",
    "status",
    "created_at",
    "updated_at",
    "legacy_wp_post_id"
  ],
  liveColumns.directory_entries
);

await batchUpsert(sql, "blog_categories", blogCategoryRows, blogCategoryColumns, "slug");
await batchUpsert(sql, "tags", tagRows, tagColumns, "slug");
await batchUpsert(
  sql,
  "directory_categories",
  directoryCategoryRows,
  directoryCategoryColumns,
  "slug"
);
await batchUpsert(
  sql,
  "directory_entries",
  directoryRows,
  directoryEntryColumns,
  "legacy_wp_post_id"
);

const dbPosts = new Map(
  (await sql.query(
    "SELECT id, legacy_wp_post_id FROM blog_posts WHERE legacy_wp_post_id IS NOT NULL"
  )).map((row) => [Number(row.legacy_wp_post_id), Number(row.id)])
);
const dbBlogCategories = new Map(
  (await sql.query("SELECT id, slug FROM blog_categories")).map((row) => [
    row.slug,
    Number(row.id)
  ])
);
const dbTags = new Map(
  (await sql.query("SELECT id, slug FROM tags")).map((row) => [
    row.slug,
    Number(row.id)
  ])
);
const dbDirectoryEntries = new Map(
  (await sql.query(
    "SELECT id, legacy_wp_post_id FROM directory_entries WHERE legacy_wp_post_id IS NOT NULL"
  )).map((row) => [Number(row.legacy_wp_post_id), Number(row.id)])
);
const dbDirectoryCategories = new Map(
  (await sql.query("SELECT id, slug FROM directory_categories")).map((row) => [
    row.slug,
    Number(row.id)
  ])
);

await batchInsertPairs(
  sql,
  "post_categories",
  "post_id",
  "category_id",
  postCategoryLinks
    .map((link) => ({
      post_id: dbPosts.get(link.wpPostId),
      category_id: dbBlogCategories.get(link.slug)
    }))
    .filter((link) => link.post_id && link.category_id)
);
await batchInsertPairs(
  sql,
  "post_tags",
  "post_id",
  "tag_id",
  postTagLinks
    .map((link) => ({
      post_id: dbPosts.get(link.wpPostId),
      tag_id: dbTags.get(link.slug)
    }))
    .filter((link) => link.post_id && link.tag_id)
);
await batchInsertPairs(
  sql,
  "directory_entry_categories",
  "entry_id",
  "category_id",
  directoryTermLinks
    .map((link) => ({
      entry_id: dbDirectoryEntries.get(link.wpPostId),
      category_id: dbDirectoryCategories.get(link.slug)
    }))
    .filter((link) => link.entry_id && link.category_id)
);

const [summary] = await sql.query(
  `SELECT
     (SELECT count(*)::int FROM blog_categories) AS blog_categories,
     (SELECT count(*)::int FROM post_categories) AS post_categories,
     (SELECT count(*)::int FROM tags) AS tags,
     (SELECT count(*)::int FROM post_tags) AS post_tags,
     (SELECT count(*)::int FROM directory_categories) AS directory_categories,
     (SELECT count(*)::int FROM directory_entries) AS directory_entries,
     (SELECT count(*)::int FROM directory_entry_categories) AS directory_entry_categories`
);
console.log("\nDone.");
console.log(JSON.stringify(summary, null, 2));
