import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandedMediaFrame } from "@/components/layout/branded-media-frame";
import { PostComments } from "@/components/blog/post-comments";
import { SITE_FALLBACK_IMAGE_URL } from "@/lib/branding";
import { canModerate, getCurrentAppUser } from "@/lib/auth/server";
import { getPostBySlug, dateLabel } from "@/lib/content/wordpress";
import { buildPostCommentTree, getPostComments } from "@/lib/post-comments";
import { normalizeEmbeddedHeadings } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post not found" };

  const description =
    post.excerpt || "Read the latest accessibility technology reporting from iAccessibility.";
  const imageUrl = post.imageUrl || SITE_FALLBACK_IMAGE_URL;
  const imageAlt = post.imageUrl
    ? post.imageAlt || `${post.title} featured image`
    : "iAccessibility logo";

  return {
    title: post.title,
    description,
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url: `/blog/${post.slug}`,
      publishedTime: post.date,
      authors: post.author ? [post.author] : undefined,
      images: [
        {
          url: imageUrl,
          alt: imageAlt
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [{ url: imageUrl, alt: imageAlt }]
    }
  };
}

export default async function BlogPostPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, user] = await Promise.all([
    getPostBySlug(slug),
    getCurrentAppUser()
  ]);

  if (!post) notFound();
  const commentTree = buildPostCommentTree(await getPostComments(post.slug));

  return (
    <div className="wp-container space-y-8">
      <article>
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
            dangerouslySetInnerHTML={{ __html: normalizeEmbeddedHeadings(post.html) }}
          />
        </div>
      </article>
      <PostComments
        postSlug={post.slug}
        comments={commentTree}
        isSignedIn={Boolean(user)}
        currentUserId={user?.id ?? null}
        canModerate={canModerate(user?.role)}
      />
    </div>
  );
}
