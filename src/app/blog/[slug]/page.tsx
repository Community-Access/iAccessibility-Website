import { notFound } from "next/navigation";
import { BrandedMediaFrame } from "@/components/layout/branded-media-frame";
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
          <h1 className="text-3xl font-bold md:text-4xl">{post.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {post.author ? (
              <>
                By {post.author} <span aria-hidden="true">&middot;</span>{" "}
              </>
            ) : null}
            <time dateTime={post.date}>{dateLabel(post.date)}</time>
          </p>
          {post.excerpt ? (
            <p className="mt-4 text-lg text-muted-foreground">{post.excerpt}</p>
          ) : null}
        </header>
        <BrandedMediaFrame
          src={post.imageUrl}
          alt={post.imageAlt ?? ""}
          className="mb-8 aspect-[16/9] max-h-[30rem] rounded-lg border border-border"
          imageClassName="p-2"
        />
        <div
          className="wp-prose"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
      </div>
    </article>
  );
}
