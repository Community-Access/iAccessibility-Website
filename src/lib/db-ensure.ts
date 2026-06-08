import { sql } from "drizzle-orm";
import { db, hasDatabase } from "@/db";

let eventsTablePromise: Promise<void> | null = null;
let directoryCommentsTablePromise: Promise<void> | null = null;
let postCommentsTablePromise: Promise<void> | null = null;

async function runOnce(
  current: Promise<void> | null,
  setCurrent: (promise: Promise<void> | null) => void,
  task: () => Promise<void>
) {
  if (!hasDatabase || !db) return;
  if (current) return current;

  const promise = task().catch((error) => {
    setCurrent(null);
    throw error;
  });
  setCurrent(promise);
  return promise;
}

export async function ensureEventsTable() {
  return runOnce(
    eventsTablePromise,
    (promise) => {
      eventsTablePromise = promise;
    },
    async () => {
      await db!.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS events (
          id serial PRIMARY KEY,
          title text NOT NULL,
          slug text NOT NULL UNIQUE,
          description text,
          event_date text NOT NULL,
          start_time text NOT NULL,
          end_time text,
          timezone text NOT NULL DEFAULT 'America/Chicago',
          type text NOT NULL DEFAULT 'stream',
          location text,
          location_url text,
          status content_status NOT NULL DEFAULT 'published',
          created_by integer REFERENCES users(id) ON DELETE SET NULL,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `));
      await db!.execute(sql.raw(
        "CREATE INDEX IF NOT EXISTS events_status_idx ON events(status)"
      ));
      await db!.execute(sql.raw(
        "CREATE INDEX IF NOT EXISTS events_event_date_idx ON events(event_date)"
      ));
      await db!.execute(sql.raw(
        "CREATE INDEX IF NOT EXISTS events_created_by_idx ON events(created_by)"
      ));
    }
  );
}

export async function ensureDirectoryCommentsTable() {
  return runOnce(
    directoryCommentsTablePromise,
    (promise) => {
      directoryCommentsTablePromise = promise;
    },
    async () => {
      await db!.execute(sql.raw(`
        DO $$
        BEGIN
          CREATE TYPE comment_status AS ENUM ('visible', 'deleted');
        -- duplicate_object: type already exists. unique_violation: another
        -- request created it concurrently (pg_type unique index) — both are safe
        -- to ignore so this stays idempotent under parallel cold-start requests.
        EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL;
        END $$;
      `));
      await db!.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS directory_comments (
          id serial PRIMARY KEY,
          entry_id integer NOT NULL REFERENCES directory_entries(id) ON DELETE CASCADE,
          parent_id integer REFERENCES directory_comments(id) ON DELETE CASCADE,
          author_id integer REFERENCES users(id) ON DELETE SET NULL,
          author_name text,
          body text NOT NULL,
          status comment_status NOT NULL DEFAULT 'visible',
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `));
      await db!.execute(sql.raw(
        "CREATE INDEX IF NOT EXISTS directory_comments_entry_created_idx ON directory_comments(entry_id, created_at)"
      ));
      await db!.execute(sql.raw(
        "CREATE INDEX IF NOT EXISTS directory_comments_parent_idx ON directory_comments(parent_id)"
      ));
      await db!.execute(sql.raw(
        "CREATE INDEX IF NOT EXISTS directory_comments_author_idx ON directory_comments(author_id)"
      ));
    }
  );
}

export async function ensurePostCommentsTable() {
  return runOnce(
    postCommentsTablePromise,
    (promise) => {
      postCommentsTablePromise = promise;
    },
    async () => {
      await db!.execute(sql.raw(`
        DO $$
        BEGIN
          CREATE TYPE comment_status AS ENUM ('visible', 'deleted');
        -- duplicate_object: type already exists. unique_violation: another
        -- request created it concurrently (pg_type unique index) — both are safe
        -- to ignore so this stays idempotent under parallel cold-start requests.
        EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL;
        END $$;
      `));
      await db!.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS post_comments (
          id serial PRIMARY KEY,
          post_slug text NOT NULL,
          parent_id integer REFERENCES post_comments(id) ON DELETE CASCADE,
          author_id integer REFERENCES users(id) ON DELETE SET NULL,
          author_name text,
          body text NOT NULL,
          status comment_status NOT NULL DEFAULT 'visible',
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `));
      // Add parent_id for tables created before threading was introduced.
      await db!.execute(sql.raw(
        "ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS parent_id integer REFERENCES post_comments(id) ON DELETE CASCADE"
      ));
      await db!.execute(sql.raw(
        "CREATE INDEX IF NOT EXISTS post_comments_post_created_idx ON post_comments(post_slug, created_at)"
      ));
      await db!.execute(sql.raw(
        "CREATE INDEX IF NOT EXISTS post_comments_parent_idx ON post_comments(parent_id)"
      ));
      await db!.execute(sql.raw(
        "CREATE INDEX IF NOT EXISTS post_comments_author_idx ON post_comments(author_id)"
      ));
    }
  );
}
