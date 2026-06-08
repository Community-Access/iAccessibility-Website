"use client";

import { useRef, useState, useTransition } from "react";
import { Modal, ModalActions, ModalButton } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { deleteEvent, setEventStatus } from "./actions";

export function EventActions({
  id,
  title,
  status
}: {
  id: number;
  title: string;
  status: "draft" | "pending" | "published";
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const nextStatus = status === "published" ? "draft" : "published";

  function updateStatus() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", String(id));
      formData.set("status", nextStatus);
      try {
        await setEventStatus(formData);
        toast({
          title: nextStatus === "published" ? "Event published" : "Event drafted",
          description: title,
          variant: "success"
        });
      } catch (err) {
        toast({
          title: "Could not update event",
          description: err instanceof Error ? err.message : "Try again.",
          variant: "error"
        });
      }
    });
  }

  function removeEvent() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", String(id));
      try {
        await deleteEvent(formData);
        setConfirmOpen(false);
        toast({
          title: "Event deleted",
          description: title,
          variant: "success"
        });
      } catch (err) {
        toast({
          title: "Could not delete event",
          description: err instanceof Error ? err.message : "Try again.",
          variant: "error"
        });
      }
    });
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        onClick={updateStatus}
        disabled={pending}
        aria-label={
          nextStatus === "published"
            ? `Publish ${title}`
            : `Move ${title} to draft`
        }
        className="rounded-md border border-[#767676] px-2.5 py-1.5 text-sm font-medium text-[#222222] hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {nextStatus === "published" ? "Publish" : "Draft"}
      </button>
      <button
        ref={deleteRef}
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        aria-haspopup="dialog"
        aria-label={`Delete ${title}`}
        className="rounded-md border border-[#767676] px-2.5 py-1.5 text-sm font-medium text-[#8a1414] hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Delete
      </button>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete event?"
        description={`${title} will be permanently deleted.`}
        role="alertdialog"
        triggerRef={deleteRef}
        initialFocusRef={cancelRef}
        fallbackFocusSelector="#events-table-heading"
      >
        <ModalActions>
          <ModalButton
            ref={cancelRef}
            variant="secondary"
            onClick={() => setConfirmOpen(false)}
          >
            Cancel
          </ModalButton>
          <ModalButton variant="danger" onClick={removeEvent} disabled={pending}>
            {pending ? "Deleting..." : "Delete event"}
          </ModalButton>
        </ModalActions>
      </Modal>
    </div>
  );
}
