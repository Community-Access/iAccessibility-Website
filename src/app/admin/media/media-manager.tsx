"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  File,
  FileAudio,
  FileImage,
  FileVideo,
  Filter,
  Search,
  X
} from "lucide-react";
import { ItemTable, type ItemTableColumn } from "@/components/ui/item-table";
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

type MediaType = "image" | "video" | "audio" | "other";

const MEDIA_TYPES: Array<{ value: MediaType; label: string }> = [
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "audio", label: "Audio" },
  { value: "other", label: "Other files" }
];

const buttonClass =
  "rounded-md border border-[#767676] px-2.5 py-1.5 text-sm font-medium text-[#222222] hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function fileName(key: string) {
  const last = key.split("/").pop();
  return last || key;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mediaType(item: MediaRow): MediaType {
  if (item.mime?.startsWith("image/")) return "image";
  if (item.mime?.startsWith("video/")) return "video";
  if (item.mime?.startsWith("audio/")) return "audio";
  return "other";
}

function mediaTypeLabel(type: MediaType) {
  return MEDIA_TYPES.find((item) => item.value === type)?.label ?? "Other files";
}

function MediaIcon({ item }: { item: MediaRow }) {
  const type = mediaType(item);
  if (type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.url}
        alt={
          item.alt
            ? `Image preview: ${item.alt}`
            : `Image preview for ${fileName(item.key)}`
        }
        className="h-14 w-14 rounded-md border border-[#767676] object-cover"
      />
    );
  }
  const Icon = type === "video" ? FileVideo : type === "audio" ? FileAudio : File;
  return (
    <span className="inline-flex h-14 w-14 items-center justify-center rounded-md border border-[#767676] bg-muted text-[#595959]">
      <Icon className="h-7 w-7" aria-hidden="true" />
      <span className="sr-only">{mediaTypeLabel(type)}</span>
    </span>
  );
}

function AltTextCell({ item }: { item: MediaRow }) {
  const { toast } = useToast();
  const name = fileName(item.key);
  const [alt, setAlt] = useState(item.alt ?? "");
  const [pending, startTransition] = useTransition();
  const altId = `media-alt-${item.id}`;

  function saveAlt() {
    startTransition(async () => {
      const result = await updateMediaAlt(item.id, alt);
      toast({
        title: result.ok ? "Alt text saved" : "Could not save",
        description: result.ok ? name : result.message,
        variant: result.ok ? "success" : "error"
      });
    });
  }

  return (
    <div className="space-y-2">
      <label htmlFor={altId} className="sr-only">
        Alt text for {name}
      </label>
      <input
        id={altId}
        value={alt}
        onChange={(event) => setAlt(event.target.value)}
        placeholder="Alt text"
        className="w-full rounded-md border border-[#767676] bg-white px-3 py-2 text-sm text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      <button
        type="button"
        onClick={saveAlt}
        disabled={pending}
        aria-label={`Save alt text for ${name}`}
        className={buttonClass}
      >
        Save
      </button>
    </div>
  );
}

function MediaActions({ item }: { item: MediaRow }) {
  const { toast } = useToast();
  const name = fileName(item.key);
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

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
        description: result.ok ? name : result.message,
        variant: result.ok ? "success" : "error"
      });
    });
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <a
        href={item.url}
        rel="noopener noreferrer"
        target="_blank"
        className={buttonClass}
      >
        Open
        <span className="sr-only"> {name} in a new tab</span>
      </a>
      <button
        type="button"
        onClick={copyUrl}
        aria-label={`Copy URL for ${name}`}
        className={buttonClass}
      >
        Copy
      </button>
      <button
        ref={deleteRef}
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        aria-haspopup="dialog"
        aria-label={`Delete ${name}`}
        className={`${buttonClass} text-[#8a1414]`}
      >
        Delete
      </button>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete media?"
        description={`${name} will be permanently deleted.`}
        role="alertdialog"
        triggerRef={deleteRef}
        initialFocusRef={cancelRef}
        fallbackFocusSelector="#media-library-heading"
      >
        <ModalActions>
          <ModalButton
            ref={cancelRef}
            variant="secondary"
            onClick={() => setConfirmOpen(false)}
          >
            Cancel
          </ModalButton>
          <ModalButton variant="danger" onClick={doDelete} disabled={pending}>
            {pending ? "Deleting..." : "Delete media"}
          </ModalButton>
        </ModalActions>
      </Modal>
    </div>
  );
}

function toggleValue(values: MediaType[], value: MediaType) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function MediaManager({ items }: { items: MediaRow[] }) {
  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState<MediaType[]>([]);
  const [pendingTypes, setPendingTypes] = useState<MediaType[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const firstFilterRef = useRef<HTMLInputElement>(null);
  const didMount = useRef(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const type = mediaType(item);
      const name = fileName(item.key).toLowerCase();
      const matchesType = activeTypes.length === 0 || activeTypes.includes(type);
      const matchesSearch =
        !query ||
        name.includes(query) ||
        (item.alt ?? "").toLowerCase().includes(query) ||
        (item.mime ?? "").toLowerCase().includes(query);
      return matchesType && matchesSearch;
    });
  }, [items, search, activeTypes]);

  const typeCounts = useMemo(() => {
    const counts = new Map<MediaType, number>();
    for (const item of items) {
      const type = mediaType(item);
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    setAnnouncement("");
    const timer = window.setTimeout(() => {
      setAnnouncement(
        `${filtered.length} media item${filtered.length === 1 ? "" : "s"} shown.`
      );
    }, 450);
    return () => window.clearTimeout(timer);
  }, [activeTypes, filtered.length, search]);

  function openFilter() {
    setPendingTypes(activeTypes);
    setFilterOpen(true);
  }

  function applyFilter() {
    setActiveTypes(pendingTypes);
    setFilterOpen(false);
  }

  function clearFilters() {
    setSearch("");
    setActiveTypes([]);
    setPendingTypes([]);
  }

  const columns: ItemTableColumn<MediaRow>[] = [
    {
      key: "preview",
      header: "Preview",
      width: "w-20",
      render: (item) => <MediaIcon item={item} />
    },
    {
      key: "name",
      header: "File",
      rowHeader: true,
      render: (item) => (
        <div>
          <span className="font-semibold">{fileName(item.key)}</span>
          <p className="mt-1 break-all text-xs text-[#595959]">{item.url}</p>
        </div>
      )
    },
    {
      key: "type",
      header: "Type",
      render: (item) => (
        <span>
          {mediaTypeLabel(mediaType(item))}
          <br />
          <span className="text-sm text-[#595959]">{item.mime || "-"}</span>
        </span>
      )
    },
    {
      key: "size",
      header: "Size",
      render: (item) => formatBytes(item.bytes)
    },
    {
      key: "alt",
      header: "Alt text",
      render: (item) => <AltTextCell item={item} />
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (item) => <MediaActions item={item} />
    }
  ];

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
    <div className="space-y-5">
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="media-search" className="block text-sm font-semibold">
            Search media
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-[2.35rem] h-5 w-5 text-[#595959]"
            aria-hidden="true"
          />
          <input
            id="media-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mt-1 w-full rounded-md border border-[#767676] bg-white py-2 pl-10 pr-3 text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <button
          ref={filterButtonRef}
          type="button"
          onClick={openFilter}
          aria-haspopup="dialog"
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:self-end ${
            activeTypes.length > 0
              ? "border-[#0066bf] bg-[#0066bf] text-white hover:bg-[#035a9e]"
              : "border-[#767676] bg-white text-[#222222] hover:bg-muted"
          }`}
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filters
          {activeTypes.length > 0 ? (
            <span className="rounded-full bg-white px-1.5 text-xs font-bold text-[#0066bf]">
              <span className="sr-only">, </span>
              {activeTypes.length}
              <span className="sr-only"> active</span>
            </span>
          ) : null}
        </button>
      </div>

      {search.trim() || activeTypes.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-[#b91c1c] hover:bg-[#fee2e2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Clear all
          </button>
          <div className="flex flex-wrap gap-2">
            {activeTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  setActiveTypes((current) =>
                    current.filter((item) => item !== type)
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-[#767676] bg-white px-3 py-1 text-sm font-medium text-[#222222] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Remove ${mediaTypeLabel(type)} filter`}
              >
                {mediaTypeLabel(type)}
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <ItemTable
        caption="Media library"
        headingId="media-library-table"
        columns={columns}
        items={filtered}
        getItemKey={(item) => String(item.id)}
        emptyIcon={<FileImage className="h-10 w-10" aria-hidden="true" />}
        emptyTitle="No media match"
        emptyMessage="Try a different search or filter."
      />

      <Modal
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter media"
        description="Select media types to show."
        triggerRef={filterButtonRef}
        initialFocus="title"
      >
        <fieldset className="border-0 p-0">
          <legend className="text-sm font-semibold">Type</legend>
          <div className="mt-2 space-y-2">
            {MEDIA_TYPES.map((type, index) => {
              const count = typeCounts.get(type.value) ?? 0;
              return (
                <label key={type.value} className="flex items-center gap-2 text-sm">
                  <input
                    ref={index === 0 ? firstFilterRef : undefined}
                    type="checkbox"
                    checked={pendingTypes.includes(type.value)}
                    onChange={() =>
                      setPendingTypes((current) =>
                        toggleValue(current, type.value)
                      )
                    }
                    className="h-4 w-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <span>
                    {type.label}
                    <span aria-hidden="true"> ({count})</span>
                    <span className="sr-only">
                      , {count} media item{count === 1 ? "" : "s"}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <ModalActions>
          <ModalButton variant="secondary" onClick={() => setPendingTypes([])}>
            Clear all
          </ModalButton>
          <ModalButton variant="primary" onClick={applyFilter}>
            Apply filters
          </ModalButton>
        </ModalActions>
      </Modal>
    </div>
  );
}
