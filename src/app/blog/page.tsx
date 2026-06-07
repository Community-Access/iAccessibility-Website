import { ContentList } from "@/components/layout/content-list";
import { getLatestPosts } from "@/lib/content/wordpress";

export const dynamic = "force-dynamic";

export default async function BlogPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const posts = await getLatestPosts(24);
  const filtered = search
    ? posts.filter((post) =>
        `${post.title} ${post.excerpt}`.toLowerCase().includes(search.toLowerCase())
      )
    : posts;

  return (
    <div className="wp-container">
      <div className="wp-article">
        <h1 className="mb-6 text-3xl font-bold">Blog</h1>
        <ContentList
          title={search ? `Search results for ${search}` : "Latest Posts"}
          items={filtered}
          emptyLabel="No matching posts were found."
        />
      </div>
    </div>
  );
}
