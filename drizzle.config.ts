import { defineConfig } from "drizzle-kit";
import { readFileSync } from "node:fs";

// Load DATABASE_URL from .env.local without an extra dependency. drizzle-kit
// auto-loads .env but not .env.local, and dotenv is not installed.
if (!process.env.DATABASE_URL) {
  try {
    const env = readFileSync(".env.local", "utf8");
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

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
