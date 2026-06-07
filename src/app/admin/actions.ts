"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { blogPosts, directoryEntries, users } from "@/db/schema";
import { canModerate, getCurrentAppUser } from "@/lib/auth/server";
import { sendSubmissionDecision } from "@/lib/email/client";
import { absoluteUrl } from "@/lib/utils";

async function requireModerator() {
  const user = await getCurrentAppUser();
  if (!user || !canModerate(user.role)) {
    throw new Error("You are not authorized to review submissions.");
  }
  return user;
}

function parseDecision(value: FormDataEntryValue | null): "approved" | "rejected" | null {
  return value === "approved" || value === "rejected" ? value : null;
}

export async function decideReportPost(formData: FormData) {
  await requireModerator();
  if (!hasDatabase || !db) return;

  const id = Number(formData.get("id"));
  const decision = parseDecision(formData.get("decision"));
  if (!id || !decision) return;

  // contentStatus has no "rejected"; rejecting returns a post to draft.
  const status = decision === "approved" ? "published" : "draft";

  const [post] = await db
    .update(blogPosts)
    .set({
      status,
      publishedAt: decision === "approved" ? new Date() : null,
      updatedAt: new Date()
    })
    .where(eq(blogPosts.id, id))
    .returning();

  if (post?.authorId) {
    const author = await db.query.users.findFirst({
      where: eq(users.id, post.authorId)
    });
    if (author?.email) {
      void sendSubmissionDecision(author.email, {
        kind: "report",
        decision,
        name: author.displayName,
        itemTitle: post.title,
        liveUrl:
          decision === "approved" ? absoluteUrl(`/blog/${post.slug}`) : null
      });
    }
  }

  revalidatePath("/admin");
}

export async function decideDirectoryEntry(formData: FormData) {
  const moderator = await requireModerator();
  if (!hasDatabase || !db) return;

  const id = Number(formData.get("id"));
  const decision = parseDecision(formData.get("decision"));
  if (!id || !decision) return;

  const [entry] = await db
    .update(directoryEntries)
    .set({
      status: decision,
      approvedBy: decision === "approved" ? moderator.id : null,
      updatedAt: new Date()
    })
    .where(eq(directoryEntries.id, id))
    .returning();

  if (entry?.submittedBy) {
    const submitter = await db.query.users.findFirst({
      where: eq(users.id, entry.submittedBy)
    });
    if (submitter?.email) {
      void sendSubmissionDecision(submitter.email, {
        kind: "directory",
        decision,
        name: submitter.displayName,
        itemTitle: entry.appName,
        liveUrl: decision === "approved" ? absoluteUrl("/app-directory") : null
      });
    }
  }

  revalidatePath("/admin");
}
