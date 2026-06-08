import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { blogPosts, postComments } from "@/db/schema";
import { ensurePostCommentsTable } from "@/lib/db-ensure";

export type PostComment = {
  id: number;
  postSlug: string;
  parentId: number | null;
  authorId: number | null;
  authorName: string | null;
  body: string;
  status: "visible" | "deleted";
  createdAt: Date;
};

export type PostCommentNode = PostComment & { replies: PostCommentNode[] };

const commentColumns = {
  id: postComments.id,
  postSlug: postComments.postSlug,
  parentId: postComments.parentId,
  authorId: postComments.authorId,
  authorName: postComments.authorName,
  body: postComments.body,
  status: postComments.status,
  createdAt: postComments.createdAt
};

/**
 * All comments for a post, oldest first, as a flat list (both visible and
 * soft-deleted). Tree-building prunes deleted leaves; deleted nodes that still
 * have visible replies are kept as "Comment removed" placeholders.
 */
export async function getPostComments(postSlug: string): Promise<PostComment[]> {
  if (!hasDatabase || !db) return [];
  await ensurePostCommentsTable();

  return db
    .select(commentColumns)
    .from(postComments)
    .where(eq(postComments.postSlug, postSlug))
    .orderBy(asc(postComments.createdAt));
}

/**
 * Build a reply tree from a flat list and prune deleted leaf comments. A
 * deleted comment with surviving replies is kept (rendered as "Comment
 * removed"); a deleted comment with no surviving replies is dropped entirely.
 */
export function buildPostCommentTree(rows: PostComment[]): PostCommentNode[] {
  const nodes = new Map<number, PostCommentNode>();
  for (const row of rows) nodes.set(row.id, { ...row, replies: [] });

  const roots: PostCommentNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId != null ? nodes.get(node.parentId) : null;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }

  const prune = (list: PostCommentNode[]): PostCommentNode[] =>
    list
      .map((node) => ({ ...node, replies: prune(node.replies) }))
      .filter((node) => node.status === "visible" || node.replies.length > 0);

  return prune(roots);
}

/** Count of visible comments per post slug (for list badges). */
export async function getPostCommentCounts(postSlugs: string[]) {
  if (!hasDatabase || !db || postSlugs.length === 0)
    return new Map<string, number>();
  await ensurePostCommentsTable();

  const rows = await db
    .select({ postSlug: postComments.postSlug, value: count() })
    .from(postComments)
    .where(
      and(
        inArray(postComments.postSlug, postSlugs),
        eq(postComments.status, "visible")
      )
    )
    .groupBy(postComments.postSlug);

  return new Map(rows.map((row) => [row.postSlug, row.value]));
}

/**
 * Per post slug, how many visible comments still need a reply from the author.
 * Heuristic: comments by people other than the author, minus the author's own
 * replies on that post (each author reply clears one). Surfaced on "My Content"
 * so authors can keep engagement going on their posts.
 */
export async function getPostCommentsNeedingResponse(
  postSlugs: string[],
  authorUserId: number
) {
  const result = new Map<string, number>();
  if (!hasDatabase || !db || postSlugs.length === 0) return result;
  await ensurePostCommentsTable();

  const rows = await db
    .select(commentColumns)
    .from(postComments)
    .where(
      and(
        inArray(postComments.postSlug, postSlugs),
        eq(postComments.status, "visible")
      )
    );

  const byPost = new Map<string, { others: number; authorReplies: number }>();
  for (const row of rows) {
    const bucket = byPost.get(row.postSlug) ?? { others: 0, authorReplies: 0 };
    if (row.authorId === authorUserId) {
      if (row.parentId != null) bucket.authorReplies += 1;
    } else {
      bucket.others += 1;
    }
    byPost.set(row.postSlug, bucket);
  }

  for (const [slug, { others, authorReplies }] of byPost) {
    const pending = Math.max(0, others - authorReplies);
    if (pending > 0) result.set(slug, pending);
  }
  return result;
}

export type ModeratablePostComment = {
  id: number;
  postSlug: string;
  postTitle: string | null;
  authorName: string | null;
  body: string;
  createdAt: Date;
};

/** Recent visible comments across all posts, newest first, for moderation. */
export async function getRecentPostComments(
  limit = 200
): Promise<ModeratablePostComment[]> {
  if (!hasDatabase || !db) return [];
  await ensurePostCommentsTable();

  return db
    .select({
      id: postComments.id,
      postSlug: postComments.postSlug,
      postTitle: blogPosts.title,
      authorName: postComments.authorName,
      body: postComments.body,
      createdAt: postComments.createdAt
    })
    .from(postComments)
    .leftJoin(blogPosts, eq(blogPosts.slug, postComments.postSlug))
    .where(eq(postComments.status, "visible"))
    .orderBy(desc(postComments.createdAt))
    .limit(limit);
}

/** A comment plus its post, used to authorize and route replies/deletes. */
export async function getPostCommentWithPost(commentId: number) {
  if (!hasDatabase || !db) return null;
  await ensurePostCommentsTable();

  const [comment] = await db
    .select(commentColumns)
    .from(postComments)
    .where(eq(postComments.id, commentId))
    .limit(1);
  if (!comment) return null;

  const post = await db.query.blogPosts.findFirst({
    where: eq(blogPosts.slug, comment.postSlug)
  });
  return { comment, post: post ?? null };
}
