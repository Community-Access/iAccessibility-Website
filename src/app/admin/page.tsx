import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { blogPosts, directoryEntries } from "@/db/schema";
import { canAdmin, getCurrentAppUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

async function pendingCount(table: typeof blogPosts | typeof directoryEntries) {
  if (!hasDatabase || !db) return 0;
  const [row] = await db
    .select({ value: count() })
    .from(table)
    .where(eq(table.status, "pending"));
  return row?.value ?? 0;
}

export default async function AdminDashboard() {
  const user = await getCurrentAppUser();
  const isAdmin = canAdmin(user?.role);

  const [pendingPosts, pendingDirectory] = await Promise.all([
    pendingCount(blogPosts),
    pendingCount(directoryEntries)
  ]);
  const pendingTotal = pendingPosts + pendingDirectory;

  return (
    <div className="space-y-8">
      <section className="wp-article">
        <h1 className="text-3xl font-bold">Admin dashboard</h1>
        <p className="mt-3 text-[#595959]">
          {isAdmin
            ? "You have full administrator access."
            : "You have moderator access: you can review and decide on pending submissions."}
        </p>
      </section>

      <section className="wp-article" aria-labelledby="dashboard-review-heading">
        <h2 id="dashboard-review-heading" className="text-2xl font-semibold">
          Review queue
        </h2>
        <p className="mt-2 text-[#222222]">
          {pendingTotal === 0
            ? "Nothing is waiting for review right now."
            : `${pendingTotal} item${pendingTotal === 1 ? "" : "s"} waiting for review (${pendingPosts} report post${pendingPosts === 1 ? "" : "s"}, ${pendingDirectory} directory ${pendingDirectory === 1 ? "entry" : "entries"}).`}
        </p>
        <p className="mt-4">
          <Link
            href="/admin/review"
            className="inline-flex rounded-md bg-[#0066bf] px-4 py-2 font-semibold text-white no-underline hover:bg-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
          >
            Open the review queue
          </Link>
        </p>
      </section>

      {isAdmin ? (
        <section className="wp-article" aria-labelledby="dashboard-admin-heading">
          <h2 id="dashboard-admin-heading" className="text-2xl font-semibold">
            Content management
          </h2>
          <p className="mt-2 text-[#222222]">
            Create and manage blog posts with the block editor.
          </p>
          <p className="mt-4">
            <Link
              href="/admin/posts"
              className="inline-flex rounded-md bg-[#0066bf] px-4 py-2 font-semibold text-white no-underline hover:bg-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
            >
              Manage posts
            </Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}
