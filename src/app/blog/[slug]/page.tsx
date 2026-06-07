import { notFound } from "next/navigation";
import { getPostBySlug, dateLabel } from "@/lib/content/wordpress";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  return (
    <article className="wp-container">
      <div className="wp-article">
        <header className="mb-8">
          <p className="text-sm text-muted-foreground">
            <time dateTime={post.date}>{dateLabel(post.date)}</time>
          </p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">{post.title}</h1>
          {post.excerpt ? (
            <p className="mt-4 text-lg text-muted-foreground">{post.excerpt}</p>
          ) : null}
        </header>
        <div
          className="wp-prose"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
      </div>
    </article>
  );
}
