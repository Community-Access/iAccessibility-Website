"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PostCommentNode } from "@/lib/post-comments";
import { formatDate } from "@/lib/utils";

type CommentsContextValue = {
  postSlug: string;
  currentUserId: number | null;
  canModerate: boolean;
  isSignedIn: boolean;
  openReplyId: number | null;
  setOpenReplyId: (id: number | null) => void;
  announce: (message: string) => void;
  /** Refresh server data, then focus the given comment once it re-renders. */
  refreshAndFocus: (commentId: number | null) => void;
};

const CommentsContext = createContext<CommentsContextValue | null>(null);

function useComments() {
  const ctx = useContext(CommentsContext);
  if (!ctx) throw new Error("CommentsContext is missing");
  return ctx;
}

export function PostComments({
  postSlug,
  comments,
  isSignedIn,
  currentUserId,
  canModerate
}: {
  postSlug: string;
  comments: PostCommentNode[];
  isSignedIn: boolean;
  currentUserId: number | null;
  canModerate: boolean;
}) {
  const router = useRouter();
  const liveRef = useRef<HTMLParagraphElement>(null);
  const [openReplyId, setOpenReplyId] = useState<number | null>(null);
  const pendingFocusId = useRef<number | null>(null);

  // Polite announcements. Clear-then-set on the next frame so an identical
  // consecutive message still re-fires for assistive tech.
  function announce(message: string) {
    const node = liveRef.current;
    if (!node) return;
    node.textContent = "";
    requestAnimationFrame(() => {
      if (liveRef.current) liveRef.current.textContent = message;
    });
  }

  function refreshAndFocus(commentId: number | null) {
    pendingFocusId.current = commentId;
    router.refresh();
  }

  // After server data re-renders (comments prop changes), move focus to the
  // newly posted/affected comment so keyboard and screen-reader users land on it.
  useEffect(() => {
    const id = pendingFocusId.current;
    if (id == null) return;
    pendingFocusId.current = null;
    focusComment(id);
  }, [comments]);

  // Deep links (e.g. from "My Content" or a notification email) focus the
  // referenced comment on arrival instead of leaving focus at the page top.
  useEffect(() => {
    const match = window.location.hash.match(/^#comment-(\d+)$/);
    if (match) focusComment(Number(match[1]));
  }, []);

  const total = countComments(comments);

  return (
    <CommentsContext.Provider
      value={{
        postSlug,
        currentUserId,
        canModerate,
        isSignedIn,
        openReplyId,
        setOpenReplyId,
        announce,
        refreshAndFocus
      }}
    >
      <section className="wp-article" aria-labelledby="comments-heading">
        <h2 id="comments-heading" className="text-2xl font-semibold">
          Comments
        </h2>
        <p className="mt-2 text-[#595959]">
          {total === 0
            ? "No comments yet."
            : `${total} comment${total === 1 ? "" : "s"}.`}
        </p>

        <p
          ref={liveRef}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />

        {comments.length > 0 ? (
          <ul className="mt-5 space-y-4">
            {comments.map((comment) => (
              <CommentNode key={comment.id} comment={comment} depth={0} />
            ))}
          </ul>
        ) : null}

        <div className="mt-6 border-t border-[#767676] pt-5">
          <h3 className="text-lg font-semibold text-[#222222]">Add a comment</h3>
          {isSignedIn ? (
            <CommentForm postSlug={postSlug} fieldKey="new" />
          ) : (
            <p className="mt-3 text-[#595959]">
              <Link
                href="/auth/sign-in"
                className="font-semibold text-[#0f6cba] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Log in
              </Link>{" "}
              to comment on this post.
            </p>
          )}
        </div>
      </section>
    </CommentsContext.Provider>
  );
}

function CommentNode({
  comment,
  depth
}: {
  comment: PostCommentNode;
  depth: number;
}) {
  const { openReplyId, setOpenReplyId, isSignedIn } = useComments();
  const replyButtonRef = useRef<HTMLButtonElement>(null);
  // Cap heading depth at h4 so screen-reader heading navigation stays sane;
  // deeper nesting is conveyed by the nested lists below.
  const Heading = depth === 0 ? "h3" : "h4";
  const removed = comment.status === "deleted";
  const replyOpen = openReplyId === comment.id;

  return (
    <li>
      <article
        id={`comment-${comment.id}`}
        tabIndex={-1}
        aria-labelledby={`comment-${comment.id}-heading`}
        className="rounded-lg border border-[#767676] bg-white p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {removed ? (
          <p
            id={`comment-${comment.id}-heading`}
            className="italic text-[#595959]"
          >
            Comment removed
          </p>
        ) : (
          <>
            <Heading
              id={`comment-${comment.id}-heading`}
              className="text-base font-semibold text-[#222222]"
            >
              {comment.authorName || "Member"}
            </Heading>
            <p className="mt-1 text-sm text-[#595959]">
              <time dateTime={comment.createdAt.toISOString()}>
                {formatDate(comment.createdAt)}
              </time>
            </p>
            <p className="mt-3 whitespace-pre-wrap text-[#222222]">
              {comment.body}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {isSignedIn ? (
                <button
                  ref={replyButtonRef}
                  type="button"
                  aria-expanded={replyOpen}
                  aria-controls={`reply-form-${comment.id}`}
                  aria-label={`Reply to ${comment.authorName || "member"}`}
                  onClick={() => setOpenReplyId(replyOpen ? null : comment.id)}
                  className="text-sm font-semibold text-[#0f6cba] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {replyOpen ? "Cancel reply" : "Reply"}
                </button>
              ) : null}
              <DeleteControl comment={comment} />
            </div>
            {/* Wrapper is always rendered so the Reply button's aria-controls
                IDREF stays valid even when the form is collapsed. */}
            <div
              id={`reply-form-${comment.id}`}
              className={replyOpen ? "mt-4" : "hidden"}
            >
              {replyOpen ? (
                <CommentForm
                  postSlug={comment.postSlug}
                  parentId={comment.id}
                  fieldKey={String(comment.id)}
                  parentAuthor={comment.authorName || "member"}
                  onCancel={() => {
                    setOpenReplyId(null);
                    replyButtonRef.current?.focus();
                  }}
                />
              ) : null}
            </div>
          </>
        )}
      </article>

      {comment.replies.length > 0 ? (
        <ul className="ml-5 mt-4 space-y-4 border-l-2 border-[#d4d4d4] pl-4">
          {comment.replies.map((reply) => (
            <CommentNode key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function DeleteControl({ comment }: { comment: PostCommentNode }) {
  const { currentUserId, canModerate, announce, refreshAndFocus } =
    useComments();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const canDelete =
    canModerate ||
    (currentUserId != null && comment.authorId === currentUserId);
  if (!canDelete) return null;

  async function onDelete() {
    setPending(true);
    const response = await fetch("/api/post-comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: comment.id })
    });
    setPending(false);
    setConfirming(false);
    if (response.ok) {
      announce("Comment removed.");
      refreshAndFocus(comment.id);
    } else {
      const payload = await response.json().catch(() => ({}));
      announce(payload.error || "The comment could not be removed.");
      triggerRef.current?.focus();
    }
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2 text-sm">
        <span>Delete this comment?</span>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="font-semibold text-[#8a1414] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {pending ? "Removing…" : "Confirm delete"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            triggerRef.current?.focus();
          }}
          className="font-semibold text-[#0f6cba] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      aria-label={`Delete comment by ${comment.authorName || "member"}`}
      onClick={() => setConfirming(true)}
      className="text-sm font-semibold text-[#8a1414] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      Delete
    </button>
  );
}

function CommentForm({
  postSlug,
  parentId,
  fieldKey,
  parentAuthor,
  onCancel
}: {
  postSlug: string;
  parentId?: number;
  fieldKey: string;
  parentAuthor?: string;
  onCancel?: () => void;
}) {
  const { announce, refreshAndFocus } = useComments();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const bodyId = `comment-${fieldKey}-body`;
  const errorId = `comment-${fieldKey}-error`;
  const isReply = parentId != null;

  // When a reply form opens, move focus into its textarea.
  useEffect(() => {
    if (isReply) textareaRef.current?.focus();
  }, [isReply]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape" && onCancel) {
      event.preventDefault();
      onCancel();
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Write a comment before submitting.");
      textareaRef.current?.focus();
      return;
    }

    setLoading(true);
    setError("");

    const response = await fetch("/api/post-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postSlug, parentId, body: trimmed })
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (response.ok) {
      setBody("");
      announce(isReply ? "Reply posted." : "Comment posted.");
      onCancel?.();
      refreshAndFocus(typeof payload.id === "number" ? payload.id : null);
      return;
    }

    setError(payload.error || "The comment could not be posted.");
    textareaRef.current?.focus();
  }

  return (
    <form className="mt-3 space-y-3" onSubmit={onSubmit} onKeyDown={onKeyDown}>
      <div className="space-y-2">
        <label
          htmlFor={bodyId}
          className="block text-sm font-semibold text-[#222222]"
        >
          {isReply ? `Reply to ${parentAuthor}` : "Your comment"}
        </label>
        <Textarea
          ref={textareaRef}
          id={bodyId}
          value={body}
          rows={isReply ? 3 : 4}
          maxLength={2000}
          required
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          onChange={(event) => setBody(event.target.value)}
        />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-[#b91c1c]">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {loading ? "Posting…" : isReply ? "Post reply" : "Post comment"}
        </Button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[#767676] px-3 py-2 text-sm font-semibold text-[#222222] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

function countComments(nodes: PostCommentNode[]): number {
  return nodes.reduce(
    (sum, node) =>
      sum + (node.status === "visible" ? 1 : 0) + countComments(node.replies),
    0
  );
}

function focusComment(id: number) {
  const el = document.getElementById(`comment-${id}`);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  el.focus({ preventScroll: true });
}
