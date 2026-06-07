/**
 * Seed script — idempotent.
 *
 * Seeds ONLY the app-directory taxonomy (directory_categories). Blog
 * categories/tags come from the WordPress migration; podcast shows/episodes
 * come from RSS import — neither is seeded here.
 *
 * Idempotent: re-running inserts nothing new (onConflictDoNothing on the unique
 * slug). Safe to run any number of times.
 *
 * Run:  npx tsx scripts/seed.ts
 * NOT auto-run by any build/install step.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load DATABASE_URL from .env.local for standalone runs (outside Next.js,
// which would load it automatically). Mirrors drizzle.config.ts; no dotenv dep.
if (!process.env.DATABASE_URL) {
  try {
    const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of env.split("\n")) {
      const match = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (match) {
        process.env.DATABASE_URL = match[1].replace(/^["']|["']$/g, "");
        break;
      }
    }
  } catch {
    // .env.local absent; rely on the ambient environment instead.
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (checked env and .env.local).");
  process.exit(1);
}

// Accessibility-focused starter set for the app directory. Curated, not
// migrated — gives the submission form real options out of the box. Slugs are
// the stable unique key; names are display labels.
const DIRECTORY_CATEGORIES: { name: string; slug: string }[] = [
  { name: "Screen Readers", slug: "screen-readers" },
  { name: "Magnification & Low Vision", slug: "magnification-low-vision" },
  { name: "Blindness", slug: "blindness" },
  { name: "Deaf & Hard of Hearing", slug: "deaf-hard-of-hearing" },
  { name: "Speech & Communication (AAC)", slug: "speech-communication-aac" },
  { name: "Cognitive & Learning", slug: "cognitive-learning" },
  { name: "Motor & Mobility", slug: "motor-mobility" },
  { name: "Switch Control", slug: "switch-control" },
  { name: "Navigation & Wayfinding", slug: "navigation-wayfinding" },
  { name: "Reading & Literacy", slug: "reading-literacy" },
  { name: "Productivity", slug: "productivity" },
  { name: "Education", slug: "education" },
  { name: "Communication", slug: "communication" },
  { name: "Entertainment & Media", slug: "entertainment-media" },
  { name: "Health & Daily Living", slug: "health-daily-living" },
  { name: "Games", slug: "games" },
  { name: "Utilities & Tools", slug: "utilities-tools" },
];

async function main() {
  // Import after env is loaded so the db client picks up DATABASE_URL.
  const { db, directoryCategories } = await import("@/db");

  const before = await db.$count(directoryCategories);

  await db
    .insert(directoryCategories)
    .values(DIRECTORY_CATEGORIES)
    .onConflictDoNothing({ target: directoryCategories.slug });

  const after = await db.$count(directoryCategories);

  console.log(
    `Seed complete. directory_categories: ${before} -> ${after} rows ` +
      `(${after - before} inserted, ${DIRECTORY_CATEGORIES.length - (after - before)} already present).`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
