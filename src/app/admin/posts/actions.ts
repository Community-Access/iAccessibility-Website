"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { blogCategories, blogPosts, postCategories } from "@/db/schema";
import { canAdmin, getCurrentAppUser } from "@/lib/auth/server";
import { postToSocialMedia } from "@/lib/social";
import { absoluteUrl, slugify, stripHtml } from "@/lib/utils";

export type PostActionResult = { ok: boolean; message: string };

async function requireAdmin() {
  const user = await getCurrentAppUser();
  if (!user || !canAdmin(user.role)) {
    throw new Error("You are not authorized to manage posts.");
  }
  if (!hasDatabase || !db) {
    throw new Error("The database is not configured.");
  }
  return user;
}

/** Unpublish a post — moves it back to draft and clears its publish date. */
export async function unpublishPost(id: number): Promise<PostActionResult> {
  await requireAdmin();
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Invalid post." };
  }
  await db!
    .update(blogPosts)
    .set({ status: "draft", publishedAt: null })
    .where(eq(blogPosts.id, id));
  revalidatePath("/admin/posts");
  revalidatePath("/admin");
  return { ok: true, message: "Post moved to draft." };
}

/** Permanently delete a post and its category links. */
export async function deletePost(id: number): Promise<PostActionResult> {
  await requireAdmin();
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Invalid post." };
  }
  await db!.delete(postCategories).where(eq(postCategories.postId, id));
  await db!.delete(blogPosts).where(eq(blogPosts.id, id));
  revalidatePath("/admin/posts");
  revalidatePath("/admin");
  return { ok: true, message: "Post deleted." };
}

export type CreatePostInput = {
  title: string;
  html: string;
  featuredImageUrl?: string | null;
  featuredImageAlt?: string | null;
  categoryIds?: number[];
  status: "draft" | "published";
};

export async function createPost(input: CreatePostInput) {
  const user = await getCurrentAppUser();
  if (!user || !canAdmin(user.role)) {
    throw new Error("You are not authorized to create posts.");
  }
  if (!hasDatabase || !db) {
    throw new Error("The database is not configured.");
  }

  const title = input.title.trim() || "Untitled";
  const status = input.status === "published" ? "published" : "draft";
  const html = input.html?.trim() || "<p></p>";
  const excerpt = stripHtml(html).slice(0, 240);
  const slug = `${slugify(title)}-${Date.now()}`;
  const requestedCategoryIds = Array.from(
    new Set(
      (input.categoryIds ?? []).filter(
        (id) => Number.isInteger(id) && id > 0
      )
    )
  );
  const validCategoryIds =
    requestedCategoryIds.length > 0
      ? await db
          .select({ id: blogCategories.id })
          .from(blogCategories)
          .where(inArray(blogCategories.id, requestedCategoryIds))
      : [];

  const [post] = await db
    .insert(blogPosts)
    .values({
      title,
      slug,
      body: html,
      excerpt,
      featuredImageUrl: input.featuredImageUrl || null,
      featuredImageAlt: input.featuredImageAlt ?? null,
      status,
      publishedAt: status === "published" ? new Date() : null,
      authorId: user.id
    })
    .returning();

  if (post && validCategoryIds.length > 0) {
    await db.insert(postCategories).values(
      validCategoryIds.map((category) => ({
        postId: post.id,
        categoryId: category.id
      }))
    );
  }

  if (status === "published" && post) {
    void postToSocialMedia({
      title,
      url: absoluteUrl(`/blog/${post.slug}`),
      excerpt
    });
  }

  redirect("/admin/posts");
}
