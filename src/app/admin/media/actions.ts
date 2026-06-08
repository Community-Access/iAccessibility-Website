"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { media } from "@/db/schema";
import { canAdmin, getCurrentAppUser } from "@/lib/auth/server";
import { deleteSpacesObject } from "@/lib/storage/spaces";

export type MediaActionResult = { ok: boolean; message: string };

async function requireAdmin() {
  const user = await getCurrentAppUser();
  if (!user || !canAdmin(user.role)) {
    throw new Error("You are not authorized to manage media.");
  }
  if (!hasDatabase || !db) {
    throw new Error("The database is not configured.");
  }
}

/** Update the alt text stored for a media item. */
export async function updateMediaAlt(
  id: number,
  alt: string
): Promise<MediaActionResult> {
  await requireAdmin();
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Invalid media item." };
  }
  await db!
    .update(media)
    .set({ alt: alt.trim() || null })
    .where(eq(media.id, id));
  revalidatePath("/admin/media");
  return { ok: true, message: "Alt text saved." };
}

/** Delete a media item: removes the stored object (best effort) and the row. */
export async function deleteMedia(id: number): Promise<MediaActionResult> {
  await requireAdmin();
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Invalid media item." };
  }
  const [row] = await db!
    .select({ key: media.key })
    .from(media)
    .where(eq(media.id, id))
    .limit(1);
  if (row?.key) {
    try {
      await deleteSpacesObject(row.key);
    } catch {
      // Object may already be gone; still remove the DB record.
    }
  }
  await db!.delete(media).where(eq(media.id, id));
  revalidatePath("/admin/media");
  return { ok: true, message: "Media deleted." };
}
