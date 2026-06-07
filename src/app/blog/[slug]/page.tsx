import { notFound } from "next/navigation";
import { SITE_LOGO_URL } from "@/lib/branding";
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
        {post.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.imageUrl}
            alt={post.imageAlt || ""}
            className="mb-8 w-full rounded-lg object-cover"
          />
        ) : (
          <div className="mb-8 flex h-48 w-full items-center justify-center rounded-lg bg-[#eef3f8]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SITE_LOGO_URL} alt="" className="h-20 w-20" />
          </div>
        )}
        <div
          className="wp-prose"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
      </div>
    </article>
  );
}
