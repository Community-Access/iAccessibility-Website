import { NextResponse } from "next/server";
import { z } from "zod";
import { db, hasDatabase } from "@/db";
import { blogPosts } from "@/db/schema";
import { getCurrentAppUser } from "@/lib/auth/server";
import { notifyAdminSubmission, sendSubmissionReceived } from "@/lib/email/client";
import {
  paragraphsFromText,
  slugify,
  stripHtml
} from "@/lib/utils";

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

  const plainContent = parsed.data.content;
  const title =
    parsed.data.title ||
    stripHtml(plainContent).split(/[.!?]/)[0]?.slice(0, 80) ||
    "Submitted Report";

  const excerpt = stripHtml(plainContent).slice(0, 240);
  const slug = `${slugify(title)}-${Date.now()}`;

  const [post] = await db
    .insert(blogPosts)
    .values({
      title,
      slug,
      body: paragraphsFromText(plainContent),
      excerpt,
      status: "pending",
      publishedAt: null,
      authorId: user.id
    })
    .returning();

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
