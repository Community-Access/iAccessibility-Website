import { NextResponse } from "next/server";
import { z } from "zod";
import { db, hasDatabase } from "@/db";
import { blogPosts } from "@/db/schema";
import { canModerate, getCurrentAppUser } from "@/lib/auth/server";
import { notifyAdminSubmission, sendSubmissionReceived } from "@/lib/email/client";
import { postToSocialMedia } from "@/lib/social";
import { uploadSubmissionFile } from "@/lib/storage/spaces";
import { absoluteUrl, paragraphsFromText, slugify, stripHtml } from "@/lib/utils";

const schema = z.object({
  title: z.string().optional(),
  content: z.string().min(1)
});

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

export async function POST(request: Request) {
  const user = await getCurrentAppUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to submit a report." },
      { status: 401 }
    );
  }

  if (!hasDatabase || !db) {
    return NextResponse.json(
      { error: "The database is not configured." },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const parsed = schema.safeParse({
    title: value(formData, "title"),
    content: value(formData, "content")
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Report content is required." },
      { status: 400 }
    );
  }

  const image = formData.get("image");
  let imageHtml = "";
  if (image instanceof File && image.size > 0) {
    const upload = await uploadSubmissionFile(image, "report-images");
    imageHtml = `<figure><img src="${upload.url}" alt=""><figcaption>Submitted image</figcaption></figure>`;
  }

  const plainContent = parsed.data.content;
  const title =
    parsed.data.title ||
    stripHtml(plainContent).split(/[.!?]/)[0]?.slice(0, 80) ||
    "Submitted Report";

  // Admins and moderators publish immediately and skip the review queue.
  const autoPublish = canModerate(user.role);
  const excerpt = stripHtml(plainContent).slice(0, 240);
  const slug = `${slugify(title)}-${Date.now()}`;

  const [post] = await db
    .insert(blogPosts)
    .values({
      title,
      slug,
      body: `${imageHtml}${paragraphsFromText(plainContent)}`,
      excerpt,
      status: autoPublish ? "published" : "pending",
      publishedAt: autoPublish ? new Date() : null,
      authorId: user.id
    })
    .returning();

  if (autoPublish) {
    // Live now — announce it on the social accounts (each network no-ops
    // unless its credentials are configured).
    void postToSocialMedia({
      title,
      url: absoluteUrl(`/blog/${post?.slug ?? slug}`),
      excerpt
    });
    return NextResponse.json({ id: post?.id, status: "published" });
  }

  void notifyAdminSubmission({
    kind: "report",
    itemTitle: title,
    rows: [
      ["Title", title],
      ["Submitted by", user.email],
      ["Review queue ID", String(post?.id ?? "")]
    ]
  });
  void sendSubmissionReceived(user.email, {
    kind: "report",
    name: user.displayName,
    itemTitle: title
  });

  return NextResponse.json({ id: post?.id, status: "pending" });
}
