import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, hasDatabase } from "@/db";
import { directoryComments, directoryEntries } from "@/db/schema";
import { getCurrentAppUser } from "@/lib/auth/server";
import { ensureDirectoryCommentsTable } from "@/lib/db-ensure";
import { notifyDirectoryComment } from "@/lib/email/client";
import { absoluteUrl } from "@/lib/utils";

const schema = z.object({
  entryId: z.coerce.number().int().positive(),
  body: z.string().trim().min(1).max(2000)
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

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Write a comment before submitting." },
      { status: 400 }
    );
  }

  await ensureDirectoryCommentsTable();

  const [entry] = await db
    .select({
      id: directoryEntries.id,
      appName: directoryEntries.appName,
      slug: directoryEntries.slug,
      status: directoryEntries.status
    })
    .from(directoryEntries)
    .where(eq(directoryEntries.id, parsed.data.entryId))
    .limit(1);

  if (!entry || entry.status !== "approved") {
    return NextResponse.json(
      { error: "The app listing was not found." },
      { status: 404 }
    );
  }

  const [comment] = await db
    .insert(directoryComments)
    .values({
      entryId: entry.id,
      authorId: user.id,
      authorName: user.displayName || user.email,
      body: parsed.data.body
    })
    .returning();

  const commentPath = `/app-directory/${entry.slug}#comment-${comment?.id ?? ""}`;
  void notifyDirectoryComment({
    entryId: entry.id,
    entryTitle: entry.appName,
    commenterEmail: user.email,
    commenterName: user.displayName || user.email,
    body: parsed.data.body,
    commentUrl: absoluteUrl(commentPath)
  });

  revalidatePath(`/app-directory/${entry.slug}`);
  revalidatePath("/account/content");

  return NextResponse.json({
    id: comment?.id,
    status: "visible"
  });
}
