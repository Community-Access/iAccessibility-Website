"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Modal, ModalActions, ModalButton } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";

export function CommentRowActions({
  id,
  authorName
}: {
  id: number;
  authorName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  function handleDelete() {
    startTransition(async () => {
      const response = await fetch("/api/post-comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const ok = response.ok;
      const payload = await response.json().catch(() => ({}));
      setConfirmOpen(false);
      toast({
        title: ok ? "Comment removed" : "Could not remove",
        description: ok
          ? `The comment by ${authorName} was removed.`
          : payload.error || "Please try again.",
        variant: ok ? "success" : "error"
      });
      if (ok) router.refresh();
    });
  }

  return (
    <div className="flex justify-end">
      <button
        ref={deleteTriggerRef}
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-label={`Delete comment by ${authorName}`}
        className="rounded-md border border-[#767676] px-2.5 py-1.5 text-sm font-medium text-[#8a1414] hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Delete
      </button>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete this comment?"
        description={`The comment by ${authorName} will be removed. Replies underneath are kept.`}
        role="alertdialog"
        triggerRef={deleteTriggerRef}
        initialFocusRef={cancelRef}
        fallbackFocusSelector="#comments-table-top"
      >
        <ModalActions>
          <ModalButton
            ref={cancelRef}
            variant="secondary"
            onClick={() => setConfirmOpen(false)}
          >
            Cancel
          </ModalButton>
          <ModalButton variant="danger" onClick={handleDelete} disabled={pending}>
            {pending ? "Removing…" : "Delete comment"}
          </ModalButton>
        </ModalActions>
      </Modal>
    </div>
  );
}
