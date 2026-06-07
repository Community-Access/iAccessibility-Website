// Backfill directory_entries.icon_url from the iTunes/App Store API.
// Idempotent: only touches rows where icon_url IS NULL.
// Strategy: prefer itunes_app_id (lookup), else parse the id out of app_store_url,
// else search by app name. Stores the 512px artwork.
//
// Usage:  node scripts/backfill-directory-icons.mjs [--dry]
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const DRY = process.argv.includes("--dry");

const dbUrl = (readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.+)$/m) ||
  [])[1]?.trim();
if (!dbUrl) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}
const sql = neon(dbUrl);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function idFromUrl(url) {
  const m = (url || "").match(/\/id(\d+)/);
  return m ? m[1] : null;
}

function pickArtwork(result) {
  if (!result) return null;
  // artworkUrl512 is the largest the lookup API returns directly; otherwise
  // upscale the 100px url by swapping the size segment.
  if (result.artworkUrl512) return result.artworkUrl512;
  if (result.artworkUrl100)
    return result.artworkUrl100.replace(/\/\d+x\d+bb\.(jpg|png)/, "/512x512bb.$1");
  if (result.artworkUrl60)
    return result.artworkUrl60.replace(/\/\d+x\d+bb\.(jpg|png)/, "/512x512bb.$1");
  return null;
}

async function lookupById(id) {
  const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(
    id
  )}&entity=software&country=US`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data = await res.json();
  return pickArtwork((data.results || [])[0]);
}

async function searchByName(name) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
    name
  )}&entity=software&country=US&limit=1`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data = await res.json();
  return pickArtwork((data.results || [])[0]);
}

const rows = await sql.query(
  "SELECT id, app_name, itunes_app_id, app_store_url FROM directory_entries WHERE icon_url IS NULL ORDER BY id"
);
console.log(`${rows.length} entries missing an icon.`);

let updated = 0;
let failed = [];
for (const row of rows) {
  const id = row.itunes_app_id || idFromUrl(row.app_store_url);
  let artwork = null;
  let via = "";
  try {
    if (id) {
      artwork = await lookupById(id);
      via = `id ${id}`;
    }
    if (!artwork) {
      artwork = await searchByName(row.app_name);
      via = `search "${row.app_name}"`;
    }
  } catch (err) {
    console.log(`  ! ${row.app_name}: ${err.message}`);
  }

  if (artwork) {
    if (!DRY) {
      await sql.query(
        "UPDATE directory_entries SET icon_url = $1, updated_at = now() WHERE id = $2",
        [artwork, row.id]
      );
    }
    updated++;
    console.log(`  ✓ ${row.app_name}  (${via})`);
  } else {
    failed.push(row.app_name);
    console.log(`  ✗ ${row.app_name}  (no artwork found)`);
  }
  await sleep(350); // be polite to the iTunes API
}

console.log(
  `\n${DRY ? "[DRY] " : ""}Updated ${updated}/${rows.length}. ${
    failed.length
  } still without an icon${failed.length ? ": " + failed.join(", ") : "."}`
);
