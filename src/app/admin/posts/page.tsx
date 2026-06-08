import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { blogPosts } from "@/db/schema";
import { ItemTable, type ItemTableColumn } from "@/components/ui/item-table";
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
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
};

export default async function AdminPostsPage() {
  const user = await getCurrentAppUser();
  if (!canAdmin(user?.role)) redirect("/admin");

  const recent: PostRow[] =
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
          .limit(100)
      : [];

  const columns: ItemTableColumn<PostRow>[] = [
    {
      key: "title",
      header: "Title",
      rowHeader: true,
      render: (p) => <h3 className="text-base font-semibold">{p.title}</h3>
    },
    {
      key: "status",
      header: "Status",
      render: (p) => <span className="capitalize">{p.status}</span>
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
        <h2 id="recent-posts-heading" className="mb-4 text-2xl font-semibold">
          All posts
        </h2>
        <ItemTable
          caption="All posts"
          headingId="recent-posts-table"
          columns={columns}
          items={recent}
          getItemKey={(p) => String(p.id)}
          getItemHref={(p) => `/blog/${p.slug}`}
          nameColumnKey="title"
          emptyTitle="No posts yet"
          emptyMessage="Create your first post with the accessible editor."
        />
      </div>
    </div>
  );
}
