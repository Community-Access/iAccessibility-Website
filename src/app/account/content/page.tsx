import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ItemTable, type ItemTableColumn } from "@/components/ui/item-table";
import { FocusOnRouteChange } from "@/components/ui/focus-on-route-change";
import { db, hasDatabase } from "@/db";
import { blogPosts, directoryEntries } from "@/db/schema";
import { getCurrentAppUser } from "@/lib/auth/server";
import { dateLabel } from "@/lib/content/wordpress";
import { getDirectoryCommentCounts } from "@/lib/directory-comments";
import {
  getPostCommentCounts,
  getPostCommentsNeedingResponse
} from "@/lib/post-comments";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "My Content"
};

type Tab = "blog" | "apps";

type BlogRow = {
  id: number;
  title: string;
  slug: string;
  status: "draft" | "pending" | "published";
  createdAt: Date;
  publishedAt: Date | null;
  comments: number;
  needsResponse: number;
};

type AppRow = {
  id: number;
  appName: string;
  slug: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  comments: number;
};

function statusLabel(status: BlogRow["status"] | AppRow["status"]) {
  if (status === "pending") return "In review";
  if (status === "published" || status === "approved") return "Published";
  if (status === "rejected") return "Rejected";
  return "Draft";
}

function TabLink({
  href,
  active,
  children
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex rounded-t-md border border-b-0 px-4 py-2 text-sm font-semibold no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        active
          ? "border-[#767676] bg-white text-[#222222]"
          : "border-transparent text-[#0f6cba] underline underline-offset-2 hover:no-underline"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function MyContentPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentAppUser();
  if (!user) redirect("/auth/sign-in");

  const { tab } = await searchParams;
  const activeTab: Tab = tab === "apps" ? "apps" : "blog";

  const [posts, appRows] =
    hasDatabase && db
      ? await Promise.all([
          db
            .select({
              id: blogPosts.id,
              title: blogPosts.title,
              slug: blogPosts.slug,
              status: blogPosts.status,
              createdAt: blogPosts.createdAt,
              publishedAt: blogPosts.publishedAt
            })
            .from(blogPosts)
            .where(eq(blogPosts.authorId, user.id))
            .orderBy(desc(blogPosts.createdAt)),
          db
            .select({
              id: directoryEntries.id,
              appName: directoryEntries.appName,
              slug: directoryEntries.slug,
              status: directoryEntries.status,
              createdAt: directoryEntries.createdAt
            })
            .from(directoryEntries)
            .where(eq(directoryEntries.submittedBy, user.id))
            .orderBy(desc(directoryEntries.createdAt))
        ])
      : [[], []];

  const [appCommentCounts, postCommentCounts, needsResponseCounts] =
    await Promise.all([
      getDirectoryCommentCounts(appRows.map((row) => row.id)),
      getPostCommentCounts(posts.map((row) => row.slug)),
      getPostCommentsNeedingResponse(
        posts.map((row) => row.slug),
        user.id
      )
    ]);
  const blogRows: BlogRow[] = posts.map((post) => ({
    ...post,
    comments: postCommentCounts.get(post.slug) ?? 0,
    needsResponse: needsResponseCounts.get(post.slug) ?? 0
  }));
  const apps: AppRow[] = appRows.map((row) => ({
    ...row,
    comments: appCommentCounts.get(row.id) ?? 0
  }));

  const blogColumns: ItemTableColumn<BlogRow>[] = [
    {
      key: "title",
      header: "Title",
      rowHeader: true,
      render: (post) => post.title
    },
    {
      key: "status",
      header: "Status",
      render: (post) => statusLabel(post.status)
    },
    {
      key: "date",
      header: "Submitted",
      render: (post) => dateLabel(post.createdAt.toISOString())
    },
    {
      key: "comments",
      header: "Comments",
      render: (post) => post.comments.toLocaleString()
    },
    {
      key: "needsResponse",
      header: "Needs reply",
      render: (post) =>
        post.needsResponse > 0 ? (
          <Link
            href={`/blog/${post.slug}#comments-heading`}
            aria-label={`${post.needsResponse} comment${
              post.needsResponse === 1 ? "" : "s"
            } awaiting your reply on ${post.title}`}
            className="font-semibold text-[#8a1414] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {post.needsResponse.toLocaleString()} to answer
          </Link>
        ) : (
          <span className="text-[#595959]">None</span>
        )
    },
    {
      key: "link",
      header: "Public link",
      render: (post) =>
        post.status === "published" ? (
          <Link
            href={`/blog/${post.slug}`}
            className="text-[#0f6cba] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            View post
          </Link>
        ) : (
          "Not published"
        )
    }
  ];

  const appColumns: ItemTableColumn<AppRow>[] = [
    {
      key: "app",
      header: "App",
      rowHeader: true,
      render: (app) => app.appName
    },
    {
      key: "status",
      header: "Status",
      render: (app) => statusLabel(app.status)
    },
    {
      key: "date",
      header: "Submitted",
      render: (app) => dateLabel(app.createdAt.toISOString())
    },
    {
      key: "comments",
      header: "Comments",
      render: (app) => app.comments.toLocaleString()
    },
    {
      key: "link",
      header: "Public link",
      render: (app) =>
        app.status === "approved" ? (
          <Link
            href={`/app-directory/${app.slug}`}
            className="text-[#0f6cba] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            View listing
          </Link>
        ) : (
          "Not published"
        )
    }
  ];

  return (
    <div className="wp-container space-y-6">
      <article className="wp-article">
        <h1 className="text-3xl font-bold">My Content</h1>
        <p className="mt-3 text-[#595959]">
          Track your submitted blog posts and app directory listings.
        </p>
      </article>

      <div>
        <div className="flex flex-wrap gap-1 border-b border-[#767676]">
          <TabLink href="/account/content" active={activeTab === "blog"}>
            Blog submissions
          </TabLink>
          <TabLink href="/account/content?tab=apps" active={activeTab === "apps"}>
            App directory submissions
          </TabLink>
        </div>

        <div className="wp-article rounded-t-none">
          {activeTab === "blog" ? (
            <>
              <h2
                id="blog-submissions-heading"
                tabIndex={-1}
                className="mb-4 text-2xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Blog submissions
              </h2>
              <FocusOnRouteChange
                targetId="blog-submissions-heading"
                message={`Showing blog submissions, ${blogRows.length} item${
                  blogRows.length === 1 ? "" : "s"
                }.`}
              />
              <ItemTable
                caption="Blog submissions"
                headingId="blog-submissions"
                columns={blogColumns}
                items={blogRows}
                getItemKey={(post) => String(post.id)}
                emptyTitle="No blog submissions"
                emptyMessage="Submitted blog posts will appear here."
              />
            </>
          ) : (
            <>
              <h2
                id="app-submissions-heading"
                tabIndex={-1}
                className="mb-4 text-2xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                App directory submissions
              </h2>
              <FocusOnRouteChange
                targetId="app-submissions-heading"
                message={`Showing app directory submissions, ${apps.length} item${
                  apps.length === 1 ? "" : "s"
                }.`}
              />
              <ItemTable
                caption="App directory submissions"
                headingId="app-submissions"
                columns={appColumns}
                items={apps}
                getItemKey={(app) => String(app.id)}
                emptyTitle="No app submissions"
                emptyMessage="Submitted app listings will appear here."
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
