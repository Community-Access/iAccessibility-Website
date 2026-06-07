import { NextResponse } from "next/server";
import { db, hasDatabase } from "@/db";
import { media } from "@/db/schema";
import { canModerate, getCurrentAppUser } from "@/lib/auth/server";
import { uploadSubmissionFile } from "@/lib/storage/spaces";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  const user = await getCurrentAppUser();
  if (!user || !canModerate(user.role)) {
    return NextResponse.json(
      { error: "You are not authorized to upload media." },
      { status: 403 }
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const alt = form.get("alt");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Images must be 10 MB or smaller." }, { status: 400 });
  }

  const upload = await uploadSubmissionFile(file, "editor");

  if (hasDatabase && db) {
    await db
      .insert(media)
      .values({
        key: upload.key,
        url: upload.url,
        mime: upload.mime,
        bytes: upload.bytes,
        alt: typeof alt === "string" && alt.trim() ? alt.trim() : null,
        uploadedBy: user.id
      })
      .onConflictDoNothing();
  }

  return NextResponse.json({ url: upload.url });
}
