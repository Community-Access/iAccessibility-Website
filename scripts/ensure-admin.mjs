// Ensure an email has administrator access in public.users.
// This does not write Neon Auth credentials. If the auth account does not
// exist yet, the row is claimable when that email signs up and signs in.
//
// Usage: node scripts/ensure-admin.mjs taylor@techopolis.app
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const email = (process.argv[2] || "").trim().toLowerCase();

if (!email || !email.includes("@")) {
  console.error("Usage: node scripts/ensure-admin.mjs email@example.com");
  process.exit(1);
}

const env = readFileSync(".env.local", "utf8");
const dbUrl = (env.match(/^DATABASE_URL=(.+)$/m) || [])[1]?.trim();

if (!dbUrl) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const sql = neon(dbUrl);
const displayName = email.split("@")[0];
const pendingAuthUserId = `pending-admin:${email}`;

const rows = await sql.query(
  `INSERT INTO users (auth_user_id, email, display_name, role)
   VALUES ($1, $2, $3, 'admin'::user_role)
   ON CONFLICT (email)
   DO UPDATE SET role = 'admin'::user_role,
                 display_name = COALESCE(users.display_name, EXCLUDED.display_name),
                 updated_at = now()
   RETURNING id, email, display_name, role, auth_user_id`,
  [pendingAuthUserId, email, displayName]
);

console.log(JSON.stringify(rows[0], null, 2));
