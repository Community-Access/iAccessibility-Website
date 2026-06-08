"use client";

import { useRef, useState, useTransition } from "react";
import { Modal, ModalActions, ModalButton } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { deletePost, unpublishPost } from "./actions";

export function PostRowActions({
  id,
  title,
  status
}: {
  id: number;
  title: string;
  status: string;
}) {
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  function focusPostsHeading() {
    window.setTimeout(() => {
      document.getElementById("recent-posts-heading")?.focus();
    }, 0);
  }

  function handleUnpublish() {
    startTransition(async () => {
      const result = await unpublishPost(id);
      if (result.ok) focusPostsHeading();
      toast({
        title: result.ok ? "Post unpublished" : "Could not unpublish",
        description: result.ok ? `"${title}" moved to draft.` : result.message,
        variant: result.ok ? "success" : "error"
      });
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePost(id);
      setConfirmOpen(false);
      if (result.ok) focusPostsHeading();
      toast({
        title: result.ok ? "Post deleted" : "Could not delete",
        description: result.ok
          ? `"${title}" was permanently deleted.`
          : result.message,
        variant: result.ok ? "success" : "error"
      });
    });
  }

  const buttonClass =
    "rounded-md border border-[#767676] px-2.5 py-1.5 text-sm font-medium text-[#222222] hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {status === "published" ? (
        <button
          type="button"
          onClick={handleUnpublish}
          disabled={pending}
          aria-label={`Unpublish ${title}`}
          className={buttonClass}
        >
          Unpublish
        </button>
      ) : null}
      <button
        ref={deleteTriggerRef}
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-label={`Delete ${title}`}
        className={`${buttonClass} text-[#8a1414]`}
      >
        Delete
      </button>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete this post?"
        description={`"${title}" will be permanently deleted. This cannot be undone.`}
        role="alertdialog"
        triggerRef={deleteTriggerRef}
        initialFocusRef={cancelRef}
        fallbackFocusSelector="#recent-posts-heading"
      >
        <ModalActions>
          <ModalButton
            ref={cancelRef}
            variant="secondary"
            onClick={() => setConfirmOpen(false)}
          >
            Cancel
          </ModalButton>
          <ModalButton
            variant="danger"
            onClick={handleDelete}
            disabled={pending}
          >
            {pending ? "Deleting…" : "Delete post"}
          </ModalButton>
        </ModalActions>
      </Modal>
    </div>
  );
}
