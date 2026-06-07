import { ContentList } from "@/components/layout/content-list";
import { Pagination } from "@/components/layout/pagination";
import { getLatestPosts, getPostsPage } from "@/lib/content/wordpress";

export const dynamic = "force-dynamic";

export default async function BlogPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { search, page } = await searchParams;

  if (search) {
    const posts = await getLatestPosts(48);
    const filtered = posts.filter((post) =>
      `${post.title} ${post.excerpt}`.toLowerCase().includes(search.toLowerCase())
    );
    return (
      <div className="wp-container">
        <div className="wp-article">
          <h1 className="mb-6 text-3xl font-bold">Blog</h1>
          <ContentList
            title={`Search results for ${search}`}
            items={filtered}
            emptyLabel="No matching posts were found."
          />
        </div>
      </div>
    );
  }

  const { posts, page: activePage, totalPages } = await getPostsPage(
    Math.max(1, Number(page) || 1),
    12
  );

  return (
    <div className="wp-container">
      <div className="wp-article">
        <h1 className="mb-6 text-3xl font-bold">Blog</h1>
        <ContentList title="Latest Posts" items={posts} />
        <Pagination
          page={activePage}
          totalPages={totalPages}
          hrefFor={(p) => `/blog?page=${p}#latest-posts-heading`}
        />
      </div>
    </div>
  );
}
