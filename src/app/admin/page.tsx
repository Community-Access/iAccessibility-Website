import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { blogPosts, directoryEntries } from "@/db/schema";
import { canModerate, getCurrentAppUser } from "@/lib/auth/server";
import { dateLabel } from "@/lib/content/wordpress";
import { decideDirectoryEntry, decideReportPost } from "./actions";

export const dynamic = "force-dynamic";

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

export default async function AdminPage() {
  const user = await getCurrentAppUser();

  if (!user) redirect("/auth/sign-in");
  if (!canModerate(user.role)) redirect("/");

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

  return (
    <div className="wp-container space-y-8">
      <section className="wp-article">
        <h1 className="text-3xl font-bold">Admin Review Queue</h1>
        <p className="mt-3 text-[#595959]">
          Approve or reject pending member submissions. The submitter is emailed
          automatically when you make a decision.
        </p>
      </section>

      <section className="wp-article" aria-labelledby="pending-posts-heading">
        <h2 id="pending-posts-heading" className="mb-4 text-2xl font-semibold">
          Pending Report Posts
        </h2>
        {pendingPosts.length === 0 ? (
          <p>No pending report posts.</p>
        ) : (
          <>
            <div className="space-y-4 md:hidden" role="list" aria-label="Pending report posts">
              {pendingPosts.map((post) => (
                <article key={post.id} role="listitem" className="border-b border-border py-4">
                  <h3 className="font-semibold">{post.title}</h3>
                  <p className="text-sm text-[#595959]">
                    {dateLabel(post.createdAt.toISOString())}
                  </p>
                  <div className="mt-3">
                    <ReviewActions
                      id={post.id}
                      action={decideReportPost}
                      label={`report: ${post.title}`}
                    />
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
              <table className="w-full" aria-label="Pending report posts">
                <thead>
                  <tr className="bg-muted">
                    <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                      Title
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                      Created
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPosts.map((post) => (
                    <tr key={post.id} className="border-t border-border">
                      <td className="px-4 py-3">{post.title}</td>
                      <td className="px-4 py-3">
                        {dateLabel(post.createdAt.toISOString())}
                      </td>
                      <td className="px-4 py-3">
                        <ReviewActions
                          id={post.id}
                          action={decideReportPost}
                          label={`report: ${post.title}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="wp-article" aria-labelledby="pending-directory-heading">
        <h2 id="pending-directory-heading" className="mb-4 text-2xl font-semibold">
          Pending Directory Entries
        </h2>
        {pendingDirectory.length === 0 ? (
          <p>No pending directory entries.</p>
        ) : (
          <>
            <div className="space-y-4 md:hidden" role="list" aria-label="Pending directory entries">
              {pendingDirectory.map((entry) => (
                <article key={entry.id} role="listitem" className="border-b border-border py-4">
                  <h3 className="font-semibold">{entry.appName}</h3>
                  <p className="text-sm text-[#595959]">
                    {dateLabel(entry.createdAt.toISOString())}
                  </p>
                  <div className="mt-3">
                    <ReviewActions
                      id={entry.id}
                      action={decideDirectoryEntry}
                      label={`app: ${entry.appName}`}
                    />
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
              <table className="w-full" aria-label="Pending directory entries">
                <thead>
                  <tr className="bg-muted">
                    <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                      App
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                      Created
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDirectory.map((entry) => (
                    <tr key={entry.id} className="border-t border-border">
                      <td className="px-4 py-3">{entry.appName}</td>
                      <td className="px-4 py-3">
                        {dateLabel(entry.createdAt.toISOString())}
                      </td>
                      <td className="px-4 py-3">
                        <ReviewActions
                          id={entry.id}
                          action={decideDirectoryEntry}
                          label={`app: ${entry.appName}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
