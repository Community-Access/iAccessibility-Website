import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { blogPosts } from "@/db/schema";
import { ItemTable, type ItemTableColumn } from "@/components/ui/item-table";
import { FocusOnRouteChange } from "@/components/ui/focus-on-route-change";
import { canAdmin, getCurrentAppUser } from "@/lib/auth/server";
import { dateLabel } from "@/lib/content/wordpress";
import { PostRowActions } from "./post-row-actions";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Posts"
};

type PostRow = {
  id: number;
  title: string;
  slug: string;
  status: "draft" | "pending" | "published";
  publishedAt: Date | null;
  createdAt: Date;
};

type StatusFilter = "all" | "published" | "draft" | "pending";

function statusLabel(status: PostRow["status"]) {
  if (status === "pending") return "Pending review";
  return status === "published" ? "Published" : "Draft";
}

function statusFilterLabel(status: StatusFilter) {
  return status === "all" ? "All" : statusLabel(status);
}

function FilterLink({
  href,
  active,
  label,
  count
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-3 py-1.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        active
          ? "bg-[#0066bf] text-white no-underline"
          : "text-[#0f6cba] underline underline-offset-2 hover:no-underline"
      }`}
    >
      {label} ({count.toLocaleString()})
    </Link>
  );
}

export default async function AdminPostsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentAppUser();
  if (!canAdmin(user?.role)) redirect("/admin");

  const { status } = await searchParams;
  const activeFilter: StatusFilter =
    status === "published" || status === "draft" || status === "pending"
      ? status
      : "all";

  const allPosts: PostRow[] =
    hasDatabase && db
      ? await db
          .select({
            id: blogPosts.id,
            title: blogPosts.title,
            slug: blogPosts.slug,
            status: blogPosts.status,
            publishedAt: blogPosts.publishedAt,
            createdAt: blogPosts.createdAt
          })
          .from(blogPosts)
          .orderBy(desc(blogPosts.createdAt))
          .limit(500)
      : [];
  const recent =
    activeFilter === "all"
      ? allPosts
      : allPosts.filter((post) => post.status === activeFilter);
  const counts = {
    all: allPosts.length,
    published: allPosts.filter((post) => post.status === "published").length,
    draft: allPosts.filter((post) => post.status === "draft").length,
    pending: allPosts.filter((post) => post.status === "pending").length
  };

  const columns: ItemTableColumn<PostRow>[] = [
    {
      key: "title",
      header: "Title",
      rowHeader: true,
      render: (p) =>
        p.status === "published" ? (
          <Link
            href={`/blog/${p.slug}`}
            className="text-[#0f6cba] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {p.title}
          </Link>
        ) : (
          <span className="font-semibold">{p.title}</span>
        )
    },
    {
      key: "status",
      header: "Status",
      render: (p) => statusLabel(p.status)
    },
    {
      key: "published",
      header: "Date",
      render: (p) =>
        p.publishedAt ? dateLabel(p.publishedAt.toISOString()) : "Not published"
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (p) => (
        <PostRowActions id={p.id} title={p.title} status={p.status} />
      )
    }
  ];

  return (
    <div className="space-y-8">
      <div className="wp-article">
        <h1 className="text-3xl font-bold">Posts</h1>
        <p className="mt-3 text-[#595959]">
          Manage blog posts and write new ones with an accessible editor.
        </p>
        <p className="mt-4">
          <Link
            href="/admin/posts/new"
            className="inline-flex rounded-md bg-[#0066bf] px-4 py-2 font-semibold text-white no-underline hover:bg-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
          >
            New post
          </Link>
        </p>
      </div>

      <div className="wp-article">
        <div className="mb-4 flex flex-wrap gap-2">
          <FilterLink
            href="/admin/posts"
            active={activeFilter === "all"}
            label="All"
            count={counts.all}
          />
          <FilterLink
            href="/admin/posts?status=published"
            active={activeFilter === "published"}
            label="Published"
            count={counts.published}
          />
          <FilterLink
            href="/admin/posts?status=draft"
            active={activeFilter === "draft"}
            label="Drafts"
            count={counts.draft}
          />
          <FilterLink
            href="/admin/posts?status=pending"
            active={activeFilter === "pending"}
            label="Pending review"
            count={counts.pending}
          />
        </div>
        <h2
          id="recent-posts-heading"
          tabIndex={-1}
          className="mb-4 text-2xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {activeFilter === "all" ? "All posts" : `${statusFilterLabel(activeFilter)} posts`}
        </h2>
        <FocusOnRouteChange
          targetId="recent-posts-heading"
          message={`Showing ${
            activeFilter === "all"
              ? "all posts"
              : `${statusFilterLabel(activeFilter)} posts`
          }, ${recent.length} item${recent.length === 1 ? "" : "s"}.`}
        />
        <ItemTable
          caption={
            activeFilter === "all" ? "All posts" : `${statusFilterLabel(activeFilter)} posts`
          }
          headingId="recent-posts-table"
          columns={columns}
          items={recent}
          getItemKey={(p) => String(p.id)}
          emptyTitle="No posts yet"
          emptyMessage={
            activeFilter === "all"
              ? "Create your first post with the accessible editor."
              : "No posts match this status."
          }
        />
      </div>
    </div>
  );
}
