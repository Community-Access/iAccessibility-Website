"use server";

import { redirect } from "next/navigation";
import { db, hasDatabase } from "@/db";
import { blogPosts } from "@/db/schema";
import { canAdmin, getCurrentAppUser } from "@/lib/auth/server";
import { postToSocialMedia } from "@/lib/social";
import { absoluteUrl, slugify, stripHtml } from "@/lib/utils";

export type CreatePostInput = {
  title: string;
  html: string;
  featuredImageUrl?: string | null;
  featuredImageAlt?: string | null;
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

  const [post] = await db
    .insert(blogPosts)
    .values({
      title,
      slug,
      body: html,
      excerpt,
      featuredImageUrl: input.featuredImageUrl || null,
      featuredImageAlt: input.featuredImageAlt || null,
      status,
      publishedAt: status === "published" ? new Date() : null,
      authorId: user.id
    })
    .returning();

  if (status === "published" && post) {
    void postToSocialMedia({
      title,
      url: absoluteUrl(`/blog/${post.slug}`),
      excerpt
    });
  }

  redirect("/admin/posts");
}
