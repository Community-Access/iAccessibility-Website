import type { ReactNode } from "react";
import Link from "next/link";
import { count, eq } from "drizzle-orm";
import {
  Bell,
  CalendarDays,
  FileText,
  FolderOpen,
  Image,
  Inbox,
  PenLine,
  Podcast,
  Send,
  Users as UsersIcon
} from "lucide-react";
import { db, hasDatabase } from "@/db";
import {
  blogPosts,
  directoryEntries,
  events,
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
  table:
    | typeof users
    | typeof blogPosts
    | typeof directoryEntries
    | typeof podcastEpisodes
    | typeof events
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

const gradientStyles = {
  purpleBlue: ["rgba(110, 57, 170, 1)", "rgba(64, 100, 178, 1)"],
  orangeYellow: ["rgba(180, 110, 20, 1)", "rgba(185, 70, 35, 1)"],
  cyanBlue: ["rgba(30, 130, 160, 1)", "rgba(20, 82, 175, 1)"],
  green: ["rgba(4, 145, 92, 1)", "rgba(0, 105, 68, 1)"],
  pinkPurple: ["rgba(180, 52, 118, 1)", "rgba(115, 66, 174, 1)"],
  orangePink: ["rgba(180, 100, 36, 1)", "rgba(158, 40, 88, 1)"],
  purpleCyan: ["rgba(84, 61, 168, 1)", "rgba(43, 130, 172, 1)"],
  chartGreen: ["rgba(30, 136, 75, 1)", "rgba(0, 90, 50, 1)"],
  blue: ["rgba(32, 100, 176, 1)", "rgba(18, 38, 165, 1)"]
};

function plural(value: number, singular: string, pluralLabel = `${singular}s`) {
  return `${value.toLocaleString()} ${value === 1 ? singular : pluralLabel}`;
}

function DashboardCard({
  title,
  value,
  detail,
  href,
  icon: Icon,
  gradient
}: {
  title: string;
  value: number;
  detail: ReactNode;
  icon: typeof UsersIcon;
  gradient: string[];
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-white" aria-hidden="true" />
        <span className="text-base font-semibold leading-tight text-white">
          {title}
        </span>
      </div>
      <span className="mt-3 block text-3xl font-bold text-white">
        {value.toLocaleString()}
      </span>
      <div className="mt-1 text-sm text-white/90">{detail}</div>
    </>
  );

  const className =
    "relative block min-h-[116px] overflow-hidden p-4 no-underline shadow-wordpress transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2";
  const style = {
    background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
    borderRadius: "16px",
    boxShadow: "0 6px 10px rgba(0, 0, 0, 0.25)"
  };
  const borderOverlay = (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.18)"
      }}
    />
  );

  if (href) {
    return (
      <Link
        href={href}
        className={className}
        style={style}
      >
        {borderOverlay}
        {content}
      </Link>
    );
  }

  return (
    <div className={className} style={style}>
      {borderOverlay}
      {content}
    </div>
  );
}

function QuickActionCard({
  href,
  title,
  detail,
  icon: Icon,
  gradient
}: {
  href: string;
  title: string;
  detail: string;
  icon: typeof UsersIcon;
  gradient: string[];
}) {
  return (
    <Link
      href={href}
      className="relative block min-h-[104px] overflow-hidden p-4 no-underline shadow-wordpress transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
      style={{
        background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
        borderRadius: "16px",
        boxShadow: "0 6px 10px rgba(0, 0, 0, 0.25)"
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.18)"
        }}
      />
      <span className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-white" aria-hidden="true" />
        <span className="text-base font-semibold leading-tight text-white">
          {title}
        </span>
      </span>
      <span className="mt-2 block text-sm text-white/90">{detail}</span>
    </Link>
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
    totalEpisodes,
    totalEvents
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
    countAll(podcastEpisodes),
    countAll(events)
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
          <DashboardCard
            title="Users"
            value={totalUsers}
            icon={UsersIcon}
            gradient={gradientStyles.purpleBlue}
            detail={
              <>
                {plural(adminUsers, "admin")},{" "}
                {plural(moderatorUsers, "moderator")},{" "}
                {plural(memberUsers, "member")}
              </>
            }
            href={isAdmin ? "/admin/users" : undefined}
          />
          <DashboardCard
            title="Pending review"
            value={pendingTotal}
            icon={Inbox}
            gradient={gradientStyles.orangePink}
            detail={`${pendingPosts} report posts, ${pendingDirectory} directory entries`}
            href="/admin/review"
          />
          <DashboardCard
            title="Published posts"
            value={publishedPosts}
            icon={FileText}
            gradient={gradientStyles.green}
            detail={`${totalPosts} posts total`}
            href={isAdmin ? "/admin/posts" : undefined}
          />
          <DashboardCard
            title="Directory apps"
            value={approvedDirectory}
            icon={FolderOpen}
            gradient={gradientStyles.cyanBlue}
            detail="Approved directory entries"
          />
        </div>
      </div>

      {isAdmin ? (
        <div>
          <h2 className="mb-4 text-2xl font-semibold">Quick actions</h2>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                href: "/admin/posts/new",
                label: "Write a new post",
                detail: "Draft and publish site updates",
                icon: PenLine,
                gradient: gradientStyles.purpleBlue
              },
              {
                href: "/admin/posts",
                label: "Manage posts",
                detail: "Edit drafts and published articles",
                icon: FileText,
                gradient: gradientStyles.blue
              },
              {
                href: "/admin/media",
                label: "Media library",
                detail: "Upload and manage images",
                icon: Image,
                gradient: gradientStyles.pinkPurple
              },
              {
                href: "/admin/events",
                label: "Add an event",
                detail: `${totalEvents.toLocaleString()} event${totalEvents === 1 ? "" : "s"} total`,
                icon: CalendarDays,
                gradient: gradientStyles.purpleCyan
              },
              {
                href: "/admin/podcasts",
                label: "Browse podcasts",
                detail: "Review imported iACast episodes",
                icon: Podcast,
                gradient: gradientStyles.orangeYellow
              },
              {
                href: "/admin/review",
                label: "Pending review",
                detail: "Approve submitted content",
                icon: Bell,
                gradient: gradientStyles.orangePink
              },
              {
                href: "/admin/users",
                label: "Manage users",
                detail: "Review roles and accounts",
                icon: UsersIcon,
                gradient: gradientStyles.cyanBlue
              },
              {
                href: "/app-directory/submit",
                label: "Submit an app",
                detail: "Add a directory entry",
                icon: Send,
                gradient: gradientStyles.chartGreen
              }
            ].map((action) => (
              <li key={action.href}>
                <QuickActionCard
                  href={action.href}
                  title={action.label}
                  detail={action.detail}
                  icon={action.icon}
                  gradient={action.gradient}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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

      {isAdmin ? (
        <p className="text-sm text-[#595959]">
          {totalEpisodes.toLocaleString()} podcast episode
          {totalEpisodes === 1 ? "" : "s"} imported.{" "}
          <Link
            href="/admin/podcasts"
            className="text-[#0f6cba] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Browse podcasts
          </Link>
        </p>
      ) : null}
    </div>
  );
}
