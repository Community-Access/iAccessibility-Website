"use client";

import { useRef, useState, useTransition } from "react";
import { Modal, ModalActions, ModalButton } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { deleteMedia, updateMediaAlt } from "./actions";

export type MediaRow = {
  id: number;
  key: string;
  url: string;
  alt: string | null;
  mime: string | null;
  bytes: number | null;
  createdAt: Date;
};

function fileName(key: string) {
  const last = key.split("/").pop();
  return last || key;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const buttonClass =
  "rounded-md border border-[#767676] px-2.5 py-1.5 text-sm font-medium text-[#222222] hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function MediaItem({ item }: { item: MediaRow }) {
  const { toast } = useToast();
  const name = fileName(item.key);
  const [alt, setAlt] = useState(item.alt ?? "");
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const altId = `media-alt-${item.id}`;

  function saveAlt() {
    startTransition(async () => {
      const result = await updateMediaAlt(item.id, alt);
      toast({
        title: result.ok ? "Alt text saved" : "Could not save",
        description: result.ok ? `Updated for ${name}.` : result.message,
        variant: result.ok ? "success" : "error"
      });
    });
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(item.url);
      toast({ title: "URL copied", description: name, variant: "success" });
    } catch {
      toast({
        title: "Could not copy",
        description: "Copy the URL field manually.",
        variant: "error"
      });
    }
  }

  function doDelete() {
    startTransition(async () => {
      const result = await deleteMedia(item.id);
      setConfirmOpen(false);
      toast({
        title: result.ok ? "Media deleted" : "Could not delete",
        description: result.ok ? `${name} was deleted.` : result.message,
        variant: result.ok ? "success" : "error"
      });
    });
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-[#767676] bg-white p-3 shadow-wordpress">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.url}
        alt={item.alt || ""}
        className="h-36 w-full rounded-md border border-[#767676] object-contain"
      />
      <p className="truncate text-sm font-semibold text-[#222222]" title={name}>
        {name}
      </p>
      <p className="text-xs text-[#595959]">
        {item.mime || "image"} {formatBytes(item.bytes)}
      </p>

      <div>
        <label htmlFor={altId} className="block text-sm font-semibold">
          Alt text
        </label>
        <input
          id={altId}
          value={alt}
          onChange={(event) => setAlt(event.target.value)}
          placeholder="Describe this image"
          className="mt-1 w-full rounded-md border border-[#767676] bg-white px-3 py-2 text-sm text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={saveAlt}
          disabled={pending}
          className={buttonClass}
        >
          Save alt
        </button>
        <button
          type="button"
          onClick={copyUrl}
          aria-label={`Copy URL for ${name}`}
          className={buttonClass}
        >
          Copy URL
        </button>
        <button
          ref={deleteRef}
          type="button"
          onClick={() => setConfirmOpen(true)}
          aria-label={`Delete ${name}`}
          className={`${buttonClass} text-[#8a1414]`}
        >
          Delete
        </button>
      </div>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete this media?"
        description={`${name} will be permanently deleted. This cannot be undone.`}
        triggerRef={deleteRef}
      >
        <ModalActions>
          <ModalButton variant="secondary" onClick={() => setConfirmOpen(false)}>
            Cancel
          </ModalButton>
          <ModalButton variant="danger" onClick={doDelete} disabled={pending}>
            {pending ? "Deleting…" : "Delete media"}
          </ModalButton>
        </ModalActions>
      </Modal>
    </li>
  );
}

export function MediaManager({ items }: { items: MediaRow[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-[#767676] bg-white p-8 text-center">
        <h3 className="text-lg font-semibold text-[#222222]">No media yet</h3>
        <p className="mt-1 text-[#595959]">
          Images uploaded in the post editor appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <MediaItem key={item.id} item={item} />
      ))}
    </ul>
  );
}
