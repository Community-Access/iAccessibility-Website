"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type SubmissionStatus = {
  tone: "idle" | "success" | "error";
  message: string;
};

type BlogBlock = {
  id: string;
  text: string;
};

function createBlock(text = ""): BlogBlock {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text
  };
}

function blocksToText(blocks: BlogBlock[]) {
  return blocks
    .map((block) => block.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function ReportSubmissionForm() {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const statusId = `${baseId}-status`;
  const errorId = `${baseId}-error`;
  const titleRef = useRef<HTMLInputElement>(null);
  const blockRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const pendingFocusRef = useRef<string | null>(null);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<BlogBlock[]>(() => [createBlock()]);
  const [status, setStatus] = useState<SubmissionStatus>({
    tone: "idle",
    message: ""
  });
  const [liveMessage, setLiveMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [allBlocksSelected, setAllBlocksSelected] = useState(false);

  useEffect(() => {
    const id = pendingFocusRef.current;
    if (!id) return;
    const target = blockRefs.current[id];
    if (!target) return;
    target.focus();
    target.setSelectionRange(0, 0);
    pendingFocusRef.current = null;
  }, [blocks]);

  function focusBlock(id: string) {
    pendingFocusRef.current = id;
    window.setTimeout(() => {
      const target = blockRefs.current[id];
      if (!target) return;
      target.focus();
      target.setSelectionRange(0, 0);
      pendingFocusRef.current = null;
    }, 0);
  }

  function announce(message: string) {
    setLiveMessage("");
    window.setTimeout(() => setLiveMessage(message), 20);
  }

  function updateBlock(id: string, text: string) {
    setBlocks((current) =>
      current.map((block) => (block.id === id ? { ...block, text } : block))
    );
  }

  function insertBlockAfter(id: string, initialText = "") {
    const next = createBlock(initialText);
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === id);
      const insertionIndex = index === -1 ? current.length - 1 : index;
      return [
        ...current.slice(0, insertionIndex + 1),
        next,
        ...current.slice(insertionIndex + 1)
      ];
    });
    focusBlock(next.id);
  }

  function removeBlock(id: string) {
    setBlocks((current) => {
      if (current.length === 1) {
        announce("The only block was cleared.");
        return [{ ...current[0], text: "" }];
      }
      const index = current.findIndex((block) => block.id === id);
      const next = current.filter((block) => block.id !== id);
      const focusTarget = next[Math.min(index, next.length - 1)];
      if (focusTarget) focusBlock(focusTarget.id);
      announce("Block removed.");
      return next;
    });
  }

  function clearAllBlocks() {
    const fresh = createBlock();
    setBlocks([fresh]);
    setSelectedBlockId(null);
    setAllBlocksSelected(false);
    focusBlock(fresh.id);
    announce("All blocks cleared.");
  }

  function onBlockKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    block: BlogBlock
  ) {
    const mod = event.metaKey || event.ctrlKey;
    const index = blocks.findIndex((item) => item.id === block.id);

    if (selectedBlockId === block.id) {
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        removeBlock(block.id);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedBlockId(null);
        announce("Selection cleared.");
        return;
      }
      if (!mod) setSelectedBlockId(null);
    }

    if (allBlocksSelected) {
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        clearAllBlocks();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setAllBlocksSelected(false);
        announce("Selection cleared.");
        return;
      }
      if (!mod) setAllBlocksSelected(false);
    }

    if (mod && event.key.toLowerCase() === "a") {
      event.preventDefault();
      if (selectedBlockId === block.id) {
        setSelectedBlockId(null);
        setAllBlocksSelected(true);
        announce("All blocks selected.");
      } else {
        setSelectedBlockId(block.id);
        setAllBlocksSelected(false);
        announce(`Block ${index + 1} selected.`);
      }
      return;
    }

    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.altKey &&
      !event.metaKey &&
      !event.ctrlKey
    ) {
      event.preventDefault();
      const target = event.currentTarget;
      const before = target.value.slice(0, target.selectionStart);
      const after = target.value.slice(target.selectionEnd);
      updateBlock(block.id, before);
      insertBlockAfter(block.id, after);
      return;
    }

    if (
      event.key === "Backspace" &&
      !event.shiftKey &&
      !event.altKey &&
      !event.metaKey &&
      !event.ctrlKey &&
      event.currentTarget.value.length === 0 &&
      event.currentTarget.selectionStart === 0 &&
      event.currentTarget.selectionEnd === 0
    ) {
      event.preventDefault();
      removeBlock(block.id);
      return;
    }

    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

    const target = event.currentTarget;
    const atStart = target.selectionStart === 0 && target.selectionEnd === 0;
    const atEnd =
      target.selectionStart === target.value.length &&
      target.selectionEnd === target.value.length;

    if (event.key === "ArrowUp" && atStart && index > 0) {
      event.preventDefault();
      const previous = blocks[index - 1];
      focusBlock(previous.id);
      window.setTimeout(() => {
        const previousTarget = blockRefs.current[previous.id];
        previousTarget?.setSelectionRange(
          previousTarget.value.length,
          previousTarget.value.length
        );
      }, 0);
    }
    if (event.key === "ArrowDown" && atEnd && index < blocks.length - 1) {
      event.preventDefault();
      focusBlock(blocks[index + 1].id);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData();
    const content = blocksToText(blocks);

    if (!content) {
      setStatus({ tone: "error", message: "Blog post content is required." });
      focusBlock(blocks[0].id);
      return;
    }

    form.set("title", title.trim());
    form.set("content", content);
    setLoading(true);
    setStatus({ tone: "idle", message: "" });

    const response = await fetch("/api/submissions/report", {
      method: "POST",
      body: form
    });

    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (response.ok) {
      setTitle("");
      setBlocks([createBlock()]);
      setSelectedBlockId(null);
      setAllBlocksSelected(false);
      setStatus({
        tone: "success",
        message: "Your blog post was submitted for review."
      });
      titleRef.current?.focus();
    } else {
      setStatus({
        tone: "error",
        message: payload.error || "The blog post could not be submitted."
      });
    }
  }

  return (
    <div className="wp-article">
      <h2
        id="submit-report"
        tabIndex={-1}
        className="mb-4 text-2xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Blog Post
      </h2>
      <form className="space-y-5" onSubmit={onSubmit}>
        <div>
          <label htmlFor={titleId} className="block text-sm font-semibold">
            Blog Post Title
          </label>
          <input
            id={titleId}
            ref={titleRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.metaKey &&
                !event.ctrlKey &&
                !event.altKey
              ) {
                event.preventDefault();
                focusBlock(blocks[0].id);
              }
            }}
            autoComplete="off"
            className="mt-1 w-full rounded-md border border-[#767676] bg-white px-3 py-2 text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold">Post body</h3>
          <p className="sr-only">
            Press Enter to start a new paragraph block. Press Command A or
            Control A once to select the current block, and twice to select all
            blocks.
          </p>
          <div className="mt-3 space-y-4">
            {blocks.map((block, index) => {
              const blockId = `${baseId}-block-${block.id}`;
              const selected =
                allBlocksSelected || selectedBlockId === block.id;
              return (
                <div
                  key={block.id}
                  className={`rounded-md border bg-white p-3 ${
                    selected
                      ? "border-[#0066bf] ring-2 ring-[#0066bf]"
                      : "border-[#767676]"
                  }`}
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#222222]">
                      Paragraph
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => insertBlockAfter(block.id)}
                        className="rounded-md border border-[#767676] px-2.5 py-1 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        Add block
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBlock(block.id)}
                        className="rounded-md border border-[#767676] px-2.5 py-1 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <label htmlFor={blockId} className="sr-only">
                    Block {index + 1}, Paragraph
                  </label>
                  <textarea
                    id={blockId}
                    aria-describedby={status.tone === "error" ? errorId : undefined}
                    ref={(node) => {
                      blockRefs.current[block.id] = node;
                    }}
                    value={block.text}
                    onChange={(event) => updateBlock(block.id, event.target.value)}
                    onKeyDown={(event) => onBlockKeyDown(event, block)}
                    rows={5}
                    className="w-full rounded-md border border-[#767676] bg-white px-3 py-2 text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <p id={statusId} role="status" aria-live="polite" className="sr-only">
          {liveMessage}
        </p>
        <Button type="submit" disabled={loading} aria-describedby={statusId}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {loading ? "Submitting..." : "Submit for review"}
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
          id={errorId}
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
    </div>
  );
}
