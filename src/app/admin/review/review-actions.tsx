"use client";

import { useRef, useState } from "react";
import { ItemTable, type ItemTableColumn } from "@/components/ui/item-table";
import {
  decideDirectoryEntry,
  decideReportPost
} from "../actions";

type ReviewKind = "report" | "directory";
type ReviewDecision = "approved" | "rejected";

export type ReviewQueueRow = {
  id: number;
  title: string;
  createdLabel: string;
};

type ReviewMessage = {
  tone: "idle" | "success" | "error";
  text: string;
};

function actionKey(kind: ReviewKind, id: number) {
  return `${kind}-${id}`;
}

function itemType(kind: ReviewKind) {
  return kind === "report" ? "Report post" : "Directory entry";
}

function decisionLabel(decision: ReviewDecision) {
  return decision === "approved" ? "approved" : "rejected";
}

function ReviewButtons({
  kind,
  row,
  busy,
  pendingAction,
  onDecision,
  registerPrimaryAction
}: {
  kind: ReviewKind;
  row: ReviewQueueRow;
  busy: boolean;
  pendingAction: { key: string; decision: ReviewDecision } | null;
  onDecision: (
    kind: ReviewKind,
    row: ReviewQueueRow,
    decision: ReviewDecision
  ) => void;
  registerPrimaryAction: (
    kind: ReviewKind,
    id: number,
    node: HTMLButtonElement | null
  ) => void;
}) {
  const key = actionKey(kind, row.id);
  const isCurrent = pendingAction?.key === key;
  const label = `${kind === "report" ? "report" : "directory entry"}: ${row.title}`;

  return (
    <div className="flex flex-wrap gap-2" aria-busy={isCurrent || undefined}>
      <button
        ref={(node) => registerPrimaryAction(kind, row.id, node)}
        type="button"
        aria-disabled={busy}
        aria-label={`Approve ${label}`}
        onClick={() => {
          if (!busy) onDecision(kind, row, "approved");
        }}
        className={`rounded-md bg-[#0066bf] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2 ${
          busy ? "cursor-not-allowed opacity-60" : ""
        }`}
      >
        {isCurrent && pendingAction.decision === "approved"
          ? "Approving..."
          : "Approve"}
      </button>
      <button
        type="button"
        aria-disabled={busy}
        aria-label={`Reject ${label}`}
        onClick={() => {
          if (!busy) onDecision(kind, row, "rejected");
        }}
        className={`rounded-md border border-[#b91c1c] px-3 py-1.5 text-sm font-semibold text-[#b91c1c] hover:bg-[#b91c1c] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c] focus-visible:ring-offset-2 ${
          busy ? "cursor-not-allowed opacity-60" : ""
        }`}
      >
        {isCurrent && pendingAction.decision === "rejected"
          ? "Rejecting..."
          : "Reject"}
      </button>
    </div>
  );
}

export function ReviewQueue({
  initialPosts,
  initialDirectory
}: {
  initialPosts: ReviewQueueRow[];
  initialDirectory: ReviewQueueRow[];
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [directory, setDirectory] = useState(initialDirectory);
  const [message, setMessage] = useState<ReviewMessage>({
    tone: "idle",
    text: ""
  });
  const [pendingAction, setPendingAction] = useState<{
    key: string;
    decision: ReviewDecision;
  } | null>(null);
  const postHeadingRef = useRef<HTMLHeadingElement>(null);
  const directoryHeadingRef = useRef<HTMLHeadingElement>(null);
  const actionRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const busy = pendingAction !== null;

  function registerPrimaryAction(
    kind: ReviewKind,
    id: number,
    node: HTMLButtonElement | null
  ) {
    actionRefs.current[actionKey(kind, id)] = node;
  }

  function focusAfterRemoval(
    kind: ReviewKind,
    removedId: number,
    previousRows: ReviewQueueRow[]
  ) {
    const index = previousRows.findIndex((row) => row.id === removedId);
    const nextRow =
      index >= 0 ? previousRows[index + 1] ?? previousRows[index - 1] : null;

    window.setTimeout(() => {
      if (nextRow) {
        actionRefs.current[actionKey(kind, nextRow.id)]?.focus();
        return;
      }

      const heading =
        kind === "report" ? postHeadingRef.current : directoryHeadingRef.current;
      heading?.focus();
    }, 0);
  }

  async function onDecision(
    kind: ReviewKind,
    row: ReviewQueueRow,
    decision: ReviewDecision
  ) {
    const key = actionKey(kind, row.id);
    const previousRows = kind === "report" ? posts : directory;
    const formData = new FormData();
    formData.set("id", String(row.id));
    formData.set("decision", decision);

    setPendingAction({ key, decision });
    setMessage({ tone: "idle", text: "" });

    try {
      if (kind === "report") {
        await decideReportPost(formData);
        setPosts((current) => current.filter((item) => item.id !== row.id));
      } else {
        await decideDirectoryEntry(formData);
        setDirectory((current) => current.filter((item) => item.id !== row.id));
      }

      setMessage({
        tone: "success",
        text: `${itemType(kind)} "${row.title}" ${decisionLabel(decision)}.`
      });
      focusAfterRemoval(kind, row.id, previousRows);
    } catch (err) {
      setMessage({
        tone: "error",
        text:
          err instanceof Error
            ? err.message
            : `Could not update ${itemType(kind).toLowerCase()} "${row.title}".`
      });
    } finally {
      setPendingAction(null);
    }
  }

  const postColumns: ItemTableColumn<ReviewQueueRow>[] = [
    { key: "title", header: "Title", rowHeader: true, render: (row) => row.title },
    { key: "created", header: "Created", render: (row) => row.createdLabel },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <ReviewButtons
          kind="report"
          row={row}
          busy={busy}
          pendingAction={pendingAction}
          onDecision={onDecision}
          registerPrimaryAction={registerPrimaryAction}
        />
      )
    }
  ];

  const directoryColumns: ItemTableColumn<ReviewQueueRow>[] = [
    { key: "app", header: "App", rowHeader: true, render: (row) => row.title },
    { key: "created", header: "Created", render: (row) => row.createdLabel },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <ReviewButtons
          kind="directory"
          row={row}
          busy={busy}
          pendingAction={pendingAction}
          onDecision={onDecision}
          registerPrimaryAction={registerPrimaryAction}
        />
      )
    }
  ];

  return (
    <div className="space-y-8">
      <div className="wp-article">
        <h1 className="text-3xl font-bold">Review queue</h1>
        <p className="mt-3 text-[#595959]">
          Approve or reject pending member submissions. The submitter is emailed
          automatically when you make a decision.
        </p>
        <p
          role={message.tone === "error" ? "alert" : "status"}
          aria-live={message.tone === "error" ? "assertive" : "polite"}
          className={
            message.text
              ? `mt-4 rounded-md border border-[#767676] p-3 text-sm font-semibold ${
                  message.tone === "error" ? "text-[#b91c1c]" : "text-[#166534]"
                }`
              : "sr-only"
          }
        >
          {message.text}
        </p>
      </div>

      <div className="wp-article">
        <h2
          id="pending-posts-heading"
          ref={postHeadingRef}
          tabIndex={-1}
          className="mb-4 text-2xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
        >
          Pending Report Posts
        </h2>
        <ItemTable
          caption="Pending report posts"
          headingId="pending-posts-table"
          columns={postColumns}
          items={posts}
          getItemKey={(row) => String(row.id)}
          emptyTitle="No pending report posts"
          emptyMessage="Nothing is waiting for review."
        />
      </div>

      <div className="wp-article">
        <h2
          id="pending-directory-heading"
          ref={directoryHeadingRef}
          tabIndex={-1}
          className="mb-4 text-2xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
        >
          Pending Directory Entries
        </h2>
        <ItemTable
          caption="Pending directory entries"
          headingId="pending-directory-table"
          columns={directoryColumns}
          items={directory}
          getItemKey={(row) => String(row.id)}
          emptyTitle="No pending directory entries"
          emptyMessage="Nothing is waiting for review."
        />
      </div>
    </div>
  );
}
