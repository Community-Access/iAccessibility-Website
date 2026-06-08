import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import {
  blogPosts,
  directoryEntries,
  podcastEpisodes,
  users
} from "@/db/schema";
import { canAdmin, getCurrentAppUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Admin dashboard"
};

async function pendingCount(table: typeof blogPosts | typeof directoryEntries) {
  if (!hasDatabase || !db) return 0;
  const [row] = await db
    .select({ value: count() })
    .from(table)
    .where(eq(table.status, "pending"));
  return row?.value ?? 0;
}

async function countAll(
  table: typeof users | typeof blogPosts | typeof directoryEntries | typeof podcastEpisodes
) {
  if (!hasDatabase || !db) return 0;
  const [row] = await db.select({ value: count() }).from(table);
  return row?.value ?? 0;
}

async function userRoleCount(role: "admin" | "moderator" | "member") {
  if (!hasDatabase || !db) return 0;
  const [row] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.role, role));
  return row?.value ?? 0;
}

async function postStatusCount(status: "draft" | "pending" | "published") {
  if (!hasDatabase || !db) return 0;
  const [row] = await db
    .select({ value: count() })
    .from(blogPosts)
    .where(eq(blogPosts.status, status));
  return row?.value ?? 0;
}

async function directoryStatusCount(
  status: "pending" | "approved" | "rejected"
) {
  if (!hasDatabase || !db) return 0;
  const [row] = await db
    .select({ value: count() })
    .from(directoryEntries)
    .where(eq(directoryEntries.status, status));
  return row?.value ?? 0;
}

function DashboardStat({
  label,
  value,
  detail,
  href
}: {
  label: string;
  value: number;
  detail: string;
  href?: string;
}) {
  const content = (
    <>
      <span className="text-sm font-semibold uppercase text-[#595959]">
        {label}
      </span>
      <span className="mt-3 block text-3xl font-bold text-[#222222]">
        {value.toLocaleString()}
      </span>
      <span className="mt-1 block text-sm text-[#595959]">{detail}</span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-lg border border-[#767676] bg-white p-5 no-underline shadow-wordpress hover:border-[#0f6cba] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
      >
        {content}
        <span className="mt-3 block text-sm font-semibold text-[#0f6cba] underline">
          Open {label.toLowerCase()}
        </span>
      </Link>
    );
  }

  return (
    <div className="rounded-lg border border-[#767676] bg-white p-5 shadow-wordpress">
      {content}
    </div>
  );
}

export default async function AdminDashboard() {
  const user = await getCurrentAppUser();
  const isAdmin = canAdmin(user?.role);

  const [
    pendingPosts,
    pendingDirectory,
    totalUsers,
    adminUsers,
    moderatorUsers,
    memberUsers,
    totalPosts,
    publishedPosts,
    approvedDirectory,
    totalEpisodes
  ] = await Promise.all([
    pendingCount(blogPosts),
    pendingCount(directoryEntries),
    countAll(users),
    userRoleCount("admin"),
    userRoleCount("moderator"),
    userRoleCount("member"),
    countAll(blogPosts),
    postStatusCount("published"),
    directoryStatusCount("approved"),
    countAll(podcastEpisodes)
  ]);
  const pendingTotal = pendingPosts + pendingDirectory;

  return (
    <div className="space-y-8">
      <div className="wp-article">
        <h1 className="text-3xl font-bold">Admin dashboard</h1>
        <p className="mt-3 text-[#595959]">
          Overview of site content, submissions, users, and publishing tools.
        </p>
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-semibold">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardStat
            label="Users"
            value={totalUsers}
            detail={`${adminUsers} ${adminUsers === 1 ? "admin" : "admins"}, ${moderatorUsers} ${moderatorUsers === 1 ? "moderator" : "moderators"}, ${memberUsers} ${memberUsers === 1 ? "member" : "members"}`}
            href={isAdmin ? "/admin/users" : undefined}
          />
          <DashboardStat
            label="Pending review"
            value={pendingTotal}
            detail={`${pendingPosts} report posts, ${pendingDirectory} directory entries`}
            href="/admin/review"
          />
          <DashboardStat
            label="Published posts"
            value={publishedPosts}
            detail={`${totalPosts} posts total`}
            href={isAdmin ? "/admin/posts" : undefined}
          />
          <DashboardStat
            label="Directory apps"
            value={approvedDirectory}
            detail="Approved directory entries"
          />
        </div>
      </div>

      <div className="wp-article">
        <h2 id="dashboard-review-heading" className="text-2xl font-semibold">
          Pending review
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
            Open pending review
          </Link>
        </p>
      </div>

      {isAdmin ? (
        <div className="wp-article">
          <h2 id="dashboard-admin-heading" className="text-2xl font-semibold">
            Content management
          </h2>
          <p className="mt-2 text-[#222222]">
            Write, edit, and publish blog posts.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/admin/posts"
              className="inline-flex rounded-md bg-[#0066bf] px-4 py-2 font-semibold text-white no-underline hover:bg-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
            >
              Manage posts
            </Link>
          </div>
        </div>
      ) : null}

      <p className="text-sm text-[#595959]">
        Podcast episodes imported: {totalEpisodes.toLocaleString()}.
      </p>
    </div>
  );
}
