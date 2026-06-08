import { desc, eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { blogPosts, directoryEntries } from "@/db/schema";
import { dateLabel } from "@/lib/content/wordpress";
import { ReviewQueue, type ReviewQueueRow } from "./review-actions";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Pending review"
};

export default async function AdminReviewPage() {
  const [pendingPosts, pendingDirectory] =
    hasDatabase && db
      ? await Promise.all([
          db
            .select()
            .from(blogPosts)
            .where(eq(blogPosts.status, "pending"))
            .orderBy(desc(blogPosts.createdAt))
            .limit(50),
          db
            .select()
            .from(directoryEntries)
            .where(eq(directoryEntries.status, "pending"))
            .orderBy(desc(directoryEntries.createdAt))
            .limit(50)
        ])
      : [[], []];

  const postRows: ReviewQueueRow[] = pendingPosts.map((post) => ({
    id: post.id,
    title: post.title,
    createdLabel: dateLabel(post.createdAt.toISOString())
  }));

  const directoryRows: ReviewQueueRow[] = pendingDirectory.map((entry) => ({
    id: entry.id,
    title: entry.appName,
    createdLabel: dateLabel(entry.createdAt.toISOString())
  }));

  return <ReviewQueue initialPosts={postRows} initialDirectory={directoryRows} />;
}
