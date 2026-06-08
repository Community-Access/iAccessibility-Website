"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DirectoryComment } from "@/lib/directory-comments";
import { formatDate } from "@/lib/utils";

type CommentStatus = {
  tone: "idle" | "success" | "error";
  message: string;
};

export function DirectoryComments({
  entryId,
  comments,
  isSignedIn
}: {
  entryId: number;
  comments: DirectoryComment[];
  isSignedIn: boolean;
}) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<CommentStatus>({
    tone: "idle",
    message: ""
  });
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) {
      setStatus({ tone: "error", message: "Write a comment before submitting." });
      textareaRef.current?.focus();
      return;
    }

    setLoading(true);
    setStatus({ tone: "idle", message: "" });

    const response = await fetch("/api/directory-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId, body: trimmed })
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (response.ok) {
      setBody("");
      setStatus({ tone: "success", message: "Comment posted." });
      router.refresh();
      return;
    }

    setStatus({
      tone: "error",
      message: payload.error || "The comment could not be posted."
    });
  }

  return (
    <section className="wp-article">
      <h2 className="text-2xl font-semibold">Comments</h2>
      <p className="mt-2 text-[#595959]">
        Recommend the app, add accessibility notes, or share useful context.
      </p>

      {comments.length === 0 ? (
        <p className="mt-5 text-[#595959]">No comments yet.</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {comments.map((comment) => (
            <li key={comment.id}>
              <article
                id={`comment-${comment.id}`}
                className="rounded-lg border border-[#767676] bg-white p-4"
              >
                <h3 className="text-base font-semibold">
                  {comment.authorName || "Member"}
                </h3>
                <p className="mt-1 text-sm text-[#595959]">
                  <time dateTime={comment.createdAt.toISOString()}>
                    {formatDate(comment.createdAt)}
                  </time>
                </p>
                <p className="mt-3 whitespace-pre-wrap text-[#222222]">
                  {comment.body}
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 border-t border-[#767676] pt-5">
        {isSignedIn ? (
          <form className="space-y-3" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label
                htmlFor="directory-comment-body"
                className="text-sm font-semibold text-[#222222]"
              >
                Add a comment
              </label>
              <Textarea
                ref={textareaRef}
                id="directory-comment-body"
                value={body}
                maxLength={2000}
                required
                onChange={(event) => setBody(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {loading ? "Posting..." : "Post comment"}
            </Button>
            <p
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className={
                status.tone === "success"
                  ? "text-sm font-medium text-[#166534]"
                  : "sr-only"
              }
            >
              {status.tone === "success" ? status.message : ""}
            </p>
            <p
              role="alert"
              aria-atomic="true"
              className={
                status.tone === "error"
                  ? "text-sm font-medium text-[#b91c1c]"
                  : "sr-only"
              }
            >
              {status.tone === "error" ? status.message : ""}
            </p>
          </form>
        ) : (
          <p className="text-[#595959]">
            <Link
              href="/auth/sign-in"
              className="font-semibold text-[#0f6cba] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Log in
            </Link>{" "}
            to comment on this app.
          </p>
        )}
      </div>
    </section>
  );
}
