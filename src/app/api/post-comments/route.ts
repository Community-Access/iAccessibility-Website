import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, hasDatabase } from "@/db";
import { blogPosts, postComments } from "@/db/schema";
import { canModerate, getCurrentAppUser } from "@/lib/auth/server";
import { ensurePostCommentsTable } from "@/lib/db-ensure";
import { notifyPostComment } from "@/lib/email/client";
import { absoluteUrl } from "@/lib/utils";

const createSchema = z.object({
  postSlug: z.string().min(1),
  parentId: z.number().int().positive().optional(),
  body: z.string().trim().min(1).max(2000)
});

const deleteSchema = z.object({
  id: z.number().int().positive()
});

export async function POST(request: Request) {
  const user = await getCurrentAppUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to comment." },
      { status: 401 }
    );
  }

  if (!hasDatabase || !db) {
    return NextResponse.json(
      { error: "The database is not configured." },
      { status: 503 }
    );
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Write a comment before submitting." },
      { status: 400 }
    );
  }

  await ensurePostCommentsTable();

  const post = await db.query.blogPosts.findFirst({
    where: eq(blogPosts.slug, parsed.data.postSlug)
  });

  if (!post || post.status !== "published") {
    return NextResponse.json(
      { error: "The blog post was not found." },
      { status: 404 }
    );
  }

  // A reply's parent must exist, be visible, and belong to the same post.
  if (parsed.data.parentId != null) {
    const [parent] = await db
      .select({ id: postComments.id })
      .from(postComments)
      .where(
        and(
          eq(postComments.id, parsed.data.parentId),
          eq(postComments.postSlug, post.slug),
          eq(postComments.status, "visible")
        )
      )
      .limit(1);
    if (!parent) {
      return NextResponse.json(
        { error: "The comment you replied to is no longer available." },
        { status: 404 }
      );
    }
  }

  const [comment] = await db
    .insert(postComments)
    .values({
      postSlug: post.slug,
      parentId: parsed.data.parentId ?? null,
      authorId: user.id,
      authorName: user.displayName || user.email,
      body: parsed.data.body
    })
    .returning();

  const commentPath = `/blog/${post.slug}#comment-${comment?.id ?? ""}`;
  void notifyPostComment({
    postSlug: post.slug,
    postTitle: post.title,
    commenterEmail: user.email,
    commenterName: user.displayName || user.email,
    body: parsed.data.body,
    commentUrl: absoluteUrl(commentPath)
  });

  revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/account/content");

  return NextResponse.json({ id: comment?.id, status: "visible" });
}

export async function DELETE(request: Request) {
  const user = await getCurrentAppUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in." },
      { status: 401 }
    );
  }

  if (!hasDatabase || !db) {
    return NextResponse.json(
      { error: "The database is not configured." },
      { status: 503 }
    );
  }

  const parsed = deleteSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid comment." }, { status: 400 });
  }

  await ensurePostCommentsTable();

  const [comment] = await db
    .select({
      id: postComments.id,
      postSlug: postComments.postSlug,
      authorId: postComments.authorId
    })
    .from(postComments)
    .where(eq(postComments.id, parsed.data.id))
    .limit(1);

  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  const isOwner = comment.authorId === user.id;
  if (!isOwner && !canModerate(user.role)) {
    return NextResponse.json(
      { error: "You cannot delete this comment." },
      { status: 403 }
    );
  }

  // Soft delete so any replies underneath keep their thread context.
  await db
    .update(postComments)
    .set({ status: "deleted", body: "", updatedAt: new Date() })
    .where(eq(postComments.id, comment.id));

  revalidatePath(`/blog/${comment.postSlug}`);
  revalidatePath("/account/content");
  revalidatePath("/admin/comments");

  return NextResponse.json({ id: comment.id, status: "deleted" });
}
