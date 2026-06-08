import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { ItemTable, type ItemTableColumn } from "@/components/ui/item-table";
import { canModerate, getCurrentAppUser } from "@/lib/auth/server";
import { dateLabel } from "@/lib/content/wordpress";
import {
  getRecentPostComments,
  type ModeratablePostComment
} from "@/lib/post-comments";
import { CommentRowActions } from "./comment-row-actions";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Admin Comments"
};

export default async function AdminCommentsPage() {
  const user = await getCurrentAppUser();
  if (!canModerate(user?.role)) redirect("/admin");

  const items = await getRecentPostComments();

  const columns: ItemTableColumn<ModeratablePostComment>[] = [
    {
      key: "comment",
      header: "Comment",
      rowHeader: true,
      render: (comment) => (
        <div>
          <span className="block font-semibold">
            {comment.authorName || "Member"}
          </span>
          <p className="mt-1 line-clamp-2 text-sm text-[#595959]">
            {comment.body}
          </p>
        </div>
      )
    },
    {
      key: "post",
      header: "Post",
      render: (comment) => comment.postTitle || comment.postSlug
    },
    {
      key: "date",
      header: "Posted",
      render: (comment) => dateLabel(comment.createdAt.toISOString())
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (comment) => (
        <CommentRowActions
          id={comment.id}
          authorName={comment.authorName || "Member"}
        />
      )
    }
  ];

  return (
    <div className="space-y-8">
      <div className="wp-article">
        <h1 className="text-3xl font-bold">Comments</h1>
        <p className="mt-3 text-[#595959]">
          {items.length.toLocaleString()} comment{items.length === 1 ? "" : "s"}.
        </p>
      </div>

      <div className="wp-article">
        <ItemTable
          caption="All comments"
          headingId="comments-table"
          columns={columns}
          items={items}
          getItemKey={(comment) => String(comment.id)}
          getItemHref={(comment) =>
            `/blog/${comment.postSlug}#comment-${comment.id}`
          }
          nameColumnKey="comment"
          emptyIcon={<MessageSquare className="h-10 w-10" aria-hidden="true" />}
          emptyTitle="No comments yet"
          emptyMessage="Comments on blog posts will appear here."
        />
      </div>
    </div>
  );
}
