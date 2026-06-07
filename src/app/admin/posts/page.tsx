import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { blogPosts } from "@/db/schema";
import { canAdmin, getCurrentAppUser } from "@/lib/auth/server";
import { dateLabel } from "@/lib/content/wordpress";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  // Defense in depth: the nav hides this from moderators, but enforce it here too.
  const user = await getCurrentAppUser();
  if (!canAdmin(user?.role)) redirect("/admin");

  const recent =
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
          .orderBy(desc(blogPosts.publishedAt))
          .limit(25)
      : [];

  return (
    <div className="space-y-8">
      <section className="wp-article">
        <h1 className="text-3xl font-bold">Posts</h1>
        <p className="mt-3 text-[#595959]">
          Manage blog posts and write new ones with the block editor.
        </p>
        <p className="mt-4">
          <Link
            href="/admin/posts/new"
            className="inline-flex rounded-md bg-[#0066bf] px-4 py-2 font-semibold text-white no-underline hover:bg-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
          >
            New post
          </Link>
        </p>
      </section>

      <section className="wp-article" aria-labelledby="recent-posts-heading">
        <h2 id="recent-posts-heading" className="mb-4 text-2xl font-semibold">
          Recent posts
        </h2>
        {recent.length === 0 ? (
          <p>No posts yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full" aria-label="Recent posts">
              <thead>
                <tr className="bg-muted">
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                    Title
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                    Published
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((post) => (
                  <tr key={post.id} className="border-t border-border">
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      {post.title}
                    </th>
                    <td className="px-4 py-3 capitalize">{post.status}</td>
                    <td className="px-4 py-3">
                      {post.publishedAt
                        ? dateLabel(post.publishedAt.toISOString())
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
