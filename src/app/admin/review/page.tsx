import { desc, eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { blogPosts, directoryEntries } from "@/db/schema";
import { ItemTable, type ItemTableColumn } from "@/components/ui/item-table";
import { dateLabel } from "@/lib/content/wordpress";
import { decideDirectoryEntry, decideReportPost } from "../actions";

export const dynamic = "force-dynamic";

type PostRow = typeof blogPosts.$inferSelect;
type DirRow = typeof directoryEntries.$inferSelect;

function ReviewActions({
  id,
  action,
  label
}: {
  id: number;
  action: (formData: FormData) => Promise<void>;
  label: string;
}) {
  return (
    <form action={action} className="flex flex-wrap gap-2">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        name="decision"
        value="approved"
        aria-label={`Approve ${label}`}
        className="rounded-md bg-[#0066bf] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
      >
        Approve
      </button>
      <button
        type="submit"
        name="decision"
        value="rejected"
        aria-label={`Reject ${label}`}
        className="rounded-md border border-[#b91c1c] px-3 py-1.5 text-sm font-semibold text-[#b91c1c] hover:bg-[#b91c1c] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c] focus-visible:ring-offset-2"
      >
        Reject
      </button>
    </form>
  );
}

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

  const postColumns: ItemTableColumn<PostRow>[] = [
    { key: "title", header: "Title", rowHeader: true, render: (p) => p.title },
    {
      key: "created",
      header: "Created",
      render: (p) => dateLabel(p.createdAt.toISOString())
    },
    {
      key: "actions",
      header: "Actions",
      render: (p) => (
        <ReviewActions
          id={p.id}
          action={decideReportPost}
          label={`report: ${p.title}`}
        />
      )
    }
  ];

  const dirColumns: ItemTableColumn<DirRow>[] = [
    { key: "app", header: "App", rowHeader: true, render: (e) => e.appName },
    {
      key: "created",
      header: "Created",
      render: (e) => dateLabel(e.createdAt.toISOString())
    },
    {
      key: "actions",
      header: "Actions",
      render: (e) => (
        <ReviewActions
          id={e.id}
          action={decideDirectoryEntry}
          label={`app: ${e.appName}`}
        />
      )
    }
  ];

  return (
    <div className="space-y-8">
      <section className="wp-article">
        <h1 className="text-3xl font-bold">Review queue</h1>
        <p className="mt-3 text-[#595959]">
          Approve or reject pending member submissions. The submitter is emailed
          automatically when you make a decision.
        </p>
      </section>

      <section className="wp-article" aria-labelledby="pending-posts-heading">
        <h2 id="pending-posts-heading" className="mb-4 text-2xl font-semibold">
          Pending Report Posts
        </h2>
        <ItemTable
          caption="Pending report posts"
          headingId="pending-posts-table"
          columns={postColumns}
          items={pendingPosts}
          getItemKey={(p) => String(p.id)}
          emptyTitle="No pending report posts"
          emptyMessage="Nothing is waiting for review."
        />
      </section>

      <section className="wp-article" aria-labelledby="pending-directory-heading">
        <h2 id="pending-directory-heading" className="mb-4 text-2xl font-semibold">
          Pending Directory Entries
        </h2>
        <ItemTable
          caption="Pending directory entries"
          headingId="pending-directory-table"
          columns={dirColumns}
          items={pendingDirectory}
          getItemKey={(e) => String(e.id)}
          emptyTitle="No pending directory entries"
          emptyMessage="Nothing is waiting for review."
        />
      </section>
    </div>
  );
}
