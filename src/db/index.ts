import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// DATABASE_URL must be set (see .env.local). Neon serverless HTTP driver.
const sql = neon(process.env.DATABASE_URL || "");
export const db = drizzle(sql, { schema });

export * from "./schema";
