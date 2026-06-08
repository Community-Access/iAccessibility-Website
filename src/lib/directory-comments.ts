import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { directoryComments } from "@/db/schema";
import { ensureDirectoryCommentsTable } from "@/lib/db-ensure";

export type DirectoryComment = {
  id: number;
  entryId: number;
  authorId: number | null;
  authorName: string | null;
  body: string;
  createdAt: Date;
};

export async function getDirectoryComments(entryId: number) {
  if (!hasDatabase || !db) return [];
  await ensureDirectoryCommentsTable();

  const rows = await db
    .select({
      id: directoryComments.id,
      entryId: directoryComments.entryId,
      authorId: directoryComments.authorId,
      authorName: directoryComments.authorName,
      body: directoryComments.body,
      createdAt: directoryComments.createdAt
    })
    .from(directoryComments)
    .where(
      and(
        eq(directoryComments.entryId, entryId),
        eq(directoryComments.status, "visible")
      )
    )
    .orderBy(asc(directoryComments.createdAt));

  return rows;
}

export async function getDirectoryCommentCounts(entryIds: number[]) {
  if (!hasDatabase || !db || entryIds.length === 0) return new Map<number, number>();
  await ensureDirectoryCommentsTable();

  const rows = await db
    .select({
      entryId: directoryComments.entryId,
      value: count()
    })
    .from(directoryComments)
    .where(
      and(
        inArray(directoryComments.entryId, entryIds),
        eq(directoryComments.status, "visible")
      )
    )
    .groupBy(directoryComments.entryId);

  return new Map(rows.map((row) => [row.entryId, row.value]));
}
