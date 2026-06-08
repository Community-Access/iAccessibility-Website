"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPost } from "@/app/admin/posts/actions";
import { escapeHtml } from "@/lib/utils";

type BlockType =
  | "paragraph"
  | "heading"
  | "image"
  | "quote"
  | "bulleted-list"
  | "numbered-list";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

type EditorBlock = {
  id: string;
  type: BlockType;
  text: string;
  url?: string;
  alt?: string;
  decorative?: boolean;
  level?: HeadingLevel;
};

type BlockCommand = {
  type: BlockType;
  label: string;
  level?: HeadingLevel;
};

export type PostEditorCategory = {
  id: number;
  name: string;
};

type InvalidTarget = {
  blockId: string;
  field: "content" | "image-url" | "image-alt" | "caption";
} | null;

const blockCommands: BlockCommand[] = [
  { type: "paragraph", label: "Paragraph" },
  { type: "heading", label: "Heading 2", level: 2 },
  { type: "heading", label: "Heading 3", level: 3 },
  { type: "heading", label: "Heading 4", level: 4 },
  { type: "heading", label: "Heading 5", level: 5 },
  { type: "heading", label: "Heading 6", level: 6 },
  { type: "image", label: "Image" },
  { type: "bulleted-list", label: "Bulleted list" },
  { type: "numbered-list", label: "Numbered list" },
  { type: "quote", label: "Quote" }
];

const ambiguousLinkLabels = new Set([
  "click here",
  "here",
  "read more",
  "learn more",
  "more",
  "more info",
  "link",
  "details",
  "info",
  "go",
  "see more",
  "continue",
  "start",
  "submit",
  "download",
  "view",
  "open"
]);

const documentLikeExtensions = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "zip",
  "mp3",
  "m4a",
  "wav"
];

function createBlock(
  type: BlockType = "paragraph",
  level?: HeadingLevel
): EditorBlock {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    text: "",
    level: type === "heading" ? level ?? 2 : undefined
  };
}

function blockLabel(block: EditorBlock) {
  if (block.type === "heading") return `Heading ${block.level ?? 2}`;
  return (
    blockCommands.find((item) => item.type === block.type && !item.level)
      ?.label ?? "Paragraph"
  );
}

function commandKey(command: BlockCommand) {
  return `${command.type}-${command.level ?? "default"}`;
}

function safeHref(value: string) {
  const trimmed = value.trim();
  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("/")
  ) {
    return escapeHtml(trimmed);
  }
  return "";
}

function inlineMarkdownToHtml(value: string) {
  let html = escapeHtml(value);
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+|\/[^)\s]+)\)/g,
    (_match, label: string, href: string) => {
      const safe = safeHref(href);
      return safe ? `<a href="${safe}">${label}</a>` : label;
    }
  );
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return html;
}

function linkFileType(href: string) {
  const cleanHref = href.split(/[?#]/)[0]?.toLowerCase() ?? "";
  return documentLikeExtensions.find((extension) =>
    cleanHref.endsWith(`.${extension}`)
  );
}

function markdownLinksFromText(value: string) {
  return Array.from(
    value.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+|\/[^)\s]+)\)/g)
  ).map((match) => ({
    label: match[1].replace(/\s+/g, " ").trim(),
    href: match[2].trim()
  }));
}

function findMarkdownLinkIssue(blocks: EditorBlock[]) {
  const labelDestinations = new Map<string, Set<string>>();
  const linkEntries: Array<{
    blockId: string;
    field: "content" | "caption";
    label: string;
    href: string;
  }> = [];

  for (const block of blocks) {
    const field = block.type === "image" ? "caption" : "content";
    for (const link of markdownLinksFromText(block.text)) {
      const normalizedLabel = link.label.toLowerCase();
      linkEntries.push({ blockId: block.id, field, ...link });
      if (!labelDestinations.has(normalizedLabel)) {
        labelDestinations.set(normalizedLabel, new Set());
      }
      labelDestinations.get(normalizedLabel)?.add(link.href);
    }
  }

  for (const entry of linkEntries) {
    const normalizedLabel = entry.label.toLowerCase();
    const fileType = linkFileType(entry.href);
    if (ambiguousLinkLabels.has(normalizedLabel)) {
      return {
        blockId: entry.blockId,
        field: entry.field,
        message:
          `The link text "${entry.label}" is too vague. Use descriptive link text before saving.`
      };
    }
    if (/^(https?:\/\/|www\.)/i.test(entry.label) || entry.label === entry.href) {
      return {
        blockId: entry.blockId,
        field: entry.field,
        message:
          "A link label is a raw URL. Replace it with descriptive link text before saving."
      };
    }
    if (
      fileType &&
      !entry.label.toLowerCase().includes(fileType) &&
      !(fileType === "mp3" && /audio|episode|download/i.test(entry.label))
    ) {
      return {
        blockId: entry.blockId,
        field: entry.field,
        message:
          `The link to a .${fileType} file must include the file type or purpose in the link text.`
      };
    }
  }

  for (const [label, destinations] of labelDestinations) {
    if (destinations.size > 1) {
      const entry = linkEntries.find((item) => item.label.toLowerCase() === label);
      if (entry) {
        return {
          blockId: entry.blockId,
          field: entry.field,
          message:
            `The repeated link text "${entry.label}" points to more than one destination. Make each link label unique before saving.`
        };
      }
    }
  }

  return null;
}

function paragraphsFromMarkdown(value: string) {
  return value
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${inlineMarkdownToHtml(part).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function listItemsFromText(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").trim())
    .filter(Boolean)
    .map((line) => `<li>${inlineMarkdownToHtml(line)}</li>`)
    .join("");
}

function blocksToHtml(blocks: EditorBlock[]) {
  return blocks
    .map((block) => {
      const text = block.text.trim();
      if (block.type === "image") {
        const url = safeHref(block.url ?? "");
        if (!url) return "";
        const alt = block.decorative ? "" : escapeHtml(block.alt ?? "");
        const caption = text
          ? `<figcaption>${inlineMarkdownToHtml(text)}</figcaption>`
          : "";
        return `<figure><img src="${url}" alt="${alt}">${caption}</figure>`;
      }
      if (!text) return "";
      if (block.type === "heading") {
        const level = block.level ?? 2;
        return `<h${level}>${inlineMarkdownToHtml(text)}</h${level}>`;
      }
      if (block.type === "quote") return `<blockquote>${paragraphsFromMarkdown(text)}</blockquote>`;
      if (block.type === "bulleted-list") return `<ul>${listItemsFromText(text)}</ul>`;
      if (block.type === "numbered-list") return `<ol>${listItemsFromText(text)}</ol>`;
      return paragraphsFromMarkdown(text);
    })
    .filter(Boolean)
    .join("\n");
}

function blocksToPlainText(blocks: EditorBlock[]) {
  return blocks
    .map((block) => {
      if (block.type === "image") {
        return [
          block.url?.trim() ? `Image URL: ${block.url.trim()}` : "",
          block.decorative
            ? "Image is decorative."
            : block.alt?.trim()
              ? `Image description: ${block.alt.trim()}`
              : "",
          block.text.trim()
        ]
          .filter(Boolean)
          .join("\n");
      }
      return block.text.trim();
    })
    .filter(Boolean)
    .join("\n\n");
}

function blocksFromMarkdown(value: string) {
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  const parsed: EditorBlock[] = [];
  let paragraph: string[] = [];

  function flushParagraph() {
    const text = paragraph.join("\n").trim();
    if (text) parsed.push({ ...createBlock("paragraph"), text });
    paragraph = [];
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      flushParagraph();
      parsed.push({
        ...createBlock("image"),
        alt: imageMatch[1],
        url: imageMatch[2]
      });
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      parsed.push({
        ...createBlock("heading", headingMatch[1].length as HeadingLevel),
        text: headingMatch[2]
      });
      continue;
    }

    if (/^>\s+/.test(trimmed)) {
      flushParagraph();
      const quoteLines = [trimmed.replace(/^>\s+/, "")];
      while (lines[index + 1]?.trim().startsWith(">")) {
        index += 1;
        quoteLines.push(lines[index].trim().replace(/^>\s+/, ""));
      }
      parsed.push({ ...createBlock("quote"), text: quoteLines.join("\n") });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      const listLines = [trimmed.replace(/^[-*]\s+/, "")];
      while (/^[-*]\s+/.test(lines[index + 1]?.trim() ?? "")) {
        index += 1;
        listLines.push(lines[index].trim().replace(/^[-*]\s+/, ""));
      }
      parsed.push({
        ...createBlock("bulleted-list"),
        text: listLines.join("\n")
      });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      const listLines = [trimmed.replace(/^\d+\.\s+/, "")];
      while (/^\d+\.\s+/.test(lines[index + 1]?.trim() ?? "")) {
        index += 1;
        listLines.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
      }
      parsed.push({
        ...createBlock("numbered-list"),
        text: listLines.join("\n")
      });
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return parsed;
}

function blocksFromHtml(value: string) {
  const document = new DOMParser().parseFromString(value, "text/html");
  const parsed: EditorBlock[] = [];

  function textFrom(element: Element) {
    return element.textContent?.replace(/\n{3,}/g, "\n\n").trim() ?? "";
  }

  for (const element of Array.from(document.body.children)) {
    const tag = element.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) {
      parsed.push({
        ...createBlock("heading", Number(tag.slice(1)) as HeadingLevel),
        text: textFrom(element)
      });
    } else if (tag === "ul" || tag === "ol") {
      const items = Array.from(element.querySelectorAll("li"))
        .map((item) => textFrom(item))
        .filter(Boolean)
        .join("\n");
      parsed.push({
        ...createBlock(tag === "ul" ? "bulleted-list" : "numbered-list"),
        text: items
      });
    } else if (tag === "blockquote") {
      parsed.push({ ...createBlock("quote"), text: textFrom(element) });
    } else if (tag === "figure" || tag === "img") {
      const image = tag === "img" ? element : element.querySelector("img");
      const caption = element.querySelector("figcaption");
      if (image?.getAttribute("src")) {
        parsed.push({
          ...createBlock("image"),
          url: image.getAttribute("src") ?? "",
          alt: image.getAttribute("alt") ?? "",
          text: caption ? textFrom(caption) : ""
        });
      }
    } else {
      const text = textFrom(element);
      if (text) parsed.push({ ...createBlock("paragraph"), text });
    }
  }

  return parsed.filter((block) => block.type === "image" || block.text.trim());
}

function looksStructuredMarkdown(value: string) {
  return /(^|\n)(#{1,6}\s+|[-*]\s+|\d+\.\s+|>\s+|!\[[^\]]*\]\([^)]+\))/.test(
    value
  );
}

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/media/upload", {
    method: "POST",
    body: fd
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Image upload failed.");
  return data.url as string;
}

function isRedirect(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export default function PostEditor({
  categories = []
}: {
  categories?: PostEditorCategory[];
}) {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const bodyHeadingId = `${baseId}-body-heading`;
  const bodyHelpId = `${baseId}-body-help`;
  const fileId = `${baseId}-file`;
  const altId = `${baseId}-alt`;
  const categoryId = `${baseId}-category`;
  const errorId = `${baseId}-error`;
  const statusId = `${baseId}-status`;
  const statusHeadingId = `${baseId}-status-heading`;
  const commandTitleId = `${baseId}-command-title`;
  const commandDialogId = `${baseId}-command-dialog`;
  const commandListId = `${baseId}-command-list`;
  const commandStatusId = `${baseId}-command-status`;

  const titleRef = useRef<HTMLInputElement>(null);
  const blockRefs = useRef<Record<string, HTMLElement | null>>({});
  const imageAltRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const captionRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const menuReturnFocusRefs = useRef<Record<string, HTMLElement | null>>({});
  const altRef = useRef<HTMLInputElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const commandDialogRef = useRef<HTMLDialogElement>(null);
  const pendingBlockFocusRef = useRef<{
    blockId: string;
    cursor: "start" | "end";
  } | null>(null);
  const submitStatusRef = useRef<"draft" | "published">("draft");

  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => [createBlock()]);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [featuredUrl, setFeaturedUrl] = useState("");
  const [featuredAlt, setFeaturedAlt] = useState("");
  const [featuredDecorative, setFeaturedDecorative] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [liveMessage, setLiveMessage] = useState("");
  const [invalidField, setInvalidField] = useState<
    "title" | "body" | "alt" | null
  >(null);
  const [invalidTarget, setInvalidTarget] = useState<InvalidTarget>(null);
  const [openMenuBlockId, setOpenMenuBlockId] = useState<string | null>(null);
  const [activeBlockTypeIndex, setActiveBlockTypeIndex] = useState(0);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [allBlocksSelected, setAllBlocksSelected] = useState(false);
  const clearSnapshotRef = useRef<EditorBlock[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);
  const [commandStatus, setCommandStatus] = useState("");
  const commandReturnFocusRef = useRef<HTMLElement | null>(null);
  const liveMessageTimerRef = useRef<number | null>(null);
  const commandStatusTimerRef = useRef<number | null>(null);

  const filteredCommands = blockCommands.filter((item) =>
    item.label.toLowerCase().includes(commandQuery.trim().toLowerCase())
  );
  const safeActiveCommandIndex = Math.min(
    activeCommandIndex,
    Math.max(filteredCommands.length - 1, 0)
  );
  const activeCommand = filteredCommands[safeActiveCommandIndex];

  useEffect(() => {
    if (!commandOpen || !commandDialogRef.current) return;
    if (!commandDialogRef.current.open) {
      commandDialogRef.current.showModal();
    }
  }, [commandOpen]);

  useEffect(() => {
    if (commandStatusTimerRef.current) {
      window.clearTimeout(commandStatusTimerRef.current);
    }

    if (!commandOpen) return;

    commandStatusTimerRef.current = window.setTimeout(() => {
      setCommandStatus(
        filteredCommands.length === 0
          ? "No matching commands."
          : `${filteredCommands.length} command${filteredCommands.length === 1 ? "" : "s"} available.`
      );
    }, 250);

    return () => {
      if (commandStatusTimerRef.current) {
        window.clearTimeout(commandStatusTimerRef.current);
      }
    };
  }, [commandOpen, filteredCommands.length]);

  useEffect(() => {
    function onWindowKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openCommandPalette();
      }
    }
    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, []);

  // Land focus in the Title on mount — authors expect to start with the title,
  // not the first body block.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Warn before leaving (refresh/close/navigate) when there is unsaved content,
  // so a draft isn't lost. Native prompt; only armed when there's real content.
  useEffect(() => {
    const hasContent =
      title.trim() !== "" ||
      blocks.some(
        (block) => (block.text ?? "").trim() !== "" || Boolean(block.url)
      );
    if (!hasContent || saving) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [title, blocks, saving]);

  useEffect(() => {
    return () => {
      if (liveMessageTimerRef.current) {
        window.clearTimeout(liveMessageTimerRef.current);
      }
      if (commandStatusTimerRef.current) {
        window.clearTimeout(commandStatusTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const pending = pendingBlockFocusRef.current;
    if (!pending) return;
    if (applyBlockFocus(pending.blockId, pending.cursor)) {
      pendingBlockFocusRef.current = null;
    }
  }, [blocks]);

  function announce(message: string) {
    if (liveMessageTimerRef.current) {
      window.clearTimeout(liveMessageTimerRef.current);
    }
    setLiveMessage("");
    liveMessageTimerRef.current = window.setTimeout(() => {
      setLiveMessage(message);
      liveMessageTimerRef.current = null;
    }, 20);
  }

  function applyBlockFocus(blockId: string, cursor: "start" | "end") {
    const target = blockRefs.current[blockId];
    if (!target) return false;
    target.focus();
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    ) {
      const position = cursor === "end" ? target.value.length : 0;
      target.setSelectionRange(position, position);
    }
    return true;
  }

  function focusBlock(blockId: string, cursor: "start" | "end" = "start") {
    setFocusedBlockId(blockId);
    pendingBlockFocusRef.current = { blockId, cursor };
    window.setTimeout(() => {
      if (applyBlockFocus(blockId, cursor)) {
        pendingBlockFocusRef.current = null;
      }
    }, 0);
  }

  function focusImageAlt(blockId: string) {
    window.setTimeout(() => imageAltRefs.current[blockId]?.focus(), 0);
  }

  function focusCaption(blockId: string) {
    window.setTimeout(() => captionRefs.current[blockId]?.focus(), 0);
  }

  function focusMenu(blockId: string) {
    window.setTimeout(() => menuRefs.current[blockId]?.focus(), 0);
  }

  function fail(field: "title" | "body" | "alt", message: string) {
    setError(message);
    setInvalidField(field);
    if (field === "title") titleRef.current?.focus();
    if (field === "body") focusBlock(invalidTarget?.blockId ?? blocks[0]?.id);
    if (field === "alt") altRef.current?.focus();
  }

  function updateBlock(blockId: string, patch: Partial<EditorBlock>) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === blockId ? { ...block, ...patch } : block
      )
    );
  }

  function describeBodyField(
    blockId: string,
    field: "content" | "image-url" | "image-alt" | "caption"
  ) {
    const ids: string[] = [];
    if (
      invalidField === "body" &&
      invalidTarget?.blockId === blockId &&
      invalidTarget.field === field
    ) {
      ids.push(errorId);
    }
    return ids.length > 0 ? ids.join(" ") : undefined;
  }

  function insertBlockAfter(
    blockId: string | null,
    command: BlockCommand = blockCommands[0],
    initialText = "",
    shouldAnnounce = true
  ) {
    const nextBlock = {
      ...createBlock(command.type, command.level),
      text: initialText
    };
    setBlocks((current) => {
      const fallbackIndex = current.length - 1;
      const index = blockId
        ? current.findIndex((block) => block.id === blockId)
        : fallbackIndex;
      const insertionIndex = index === -1 ? fallbackIndex : index;
      return [
        ...current.slice(0, insertionIndex + 1),
        nextBlock,
        ...current.slice(insertionIndex + 1)
      ];
    });
    setFocusedBlockId(nextBlock.id);
    if (shouldAnnounce) announce(`${command.label} added.`);
    focusBlock(nextBlock.id);
  }

  function removeBlock(blockId: string) {
    setSelectedBlockId(null);
    setAllBlocksSelected(false);
    setBlocks((current) => {
      if (current.length === 1) {
        announce("The only block was cleared.");
        return [{ ...current[0], text: "", type: "paragraph", url: "", alt: "" }];
      }
      const index = current.findIndex((block) => block.id === blockId);
      const next = current.filter((block) => block.id !== blockId);
      const focusTarget = next[Math.min(index, next.length - 1)];
      if (focusTarget) focusBlock(focusTarget.id);
      announce("Block removed.");
      return next;
    });
  }

  function replaceBlockWithBlocks(blockId: string, nextBlocks: EditorBlock[]) {
    if (nextBlocks.length === 0) return;
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === blockId);
      if (index === -1) return current;
      return [
        ...current.slice(0, index),
        ...nextBlocks,
        ...current.slice(index + 1)
      ];
    });
    setFocusedBlockId(nextBlocks[0].id);
    announce(`${nextBlocks.length} block${nextBlocks.length === 1 ? "" : "s"} inserted.`);
    focusBlock(nextBlocks[0].id);
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === blockId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [block] = next.splice(index, 1);
      next.splice(nextIndex, 0, block);
      announce(
        `Block moved ${direction === -1 ? "up" : "down"} to position ${nextIndex + 1}.`
      );
      focusBlock(blockId);
      return next;
    });
  }

  function openBlockMenu(
    blockId: string,
    returnFocusTarget?: HTMLElement | null
  ) {
    menuReturnFocusRefs.current[blockId] =
      returnFocusTarget ?? blockRefs.current[blockId] ?? null;
    setOpenMenuBlockId(blockId);
    setActiveBlockTypeIndex(0);
    announce("Block inserter opened.");
    focusMenu(blockId);
  }

  function closeBlockMenu(blockId: string) {
    const returnTarget = menuReturnFocusRefs.current[blockId];
    setOpenMenuBlockId(null);
    window.setTimeout(() => {
      if (returnTarget?.isConnected) {
        returnTarget.focus();
      } else {
        blockRefs.current[blockId]?.focus();
      }
      menuReturnFocusRefs.current[blockId] = null;
    }, 0);
  }

  function selectBlockType(blockId: string, command: BlockCommand) {
    updateBlock(blockId, { type: command.type, level: command.level });
    setOpenMenuBlockId(null);
    announce(`${command.label} selected.`);
    menuReturnFocusRefs.current[blockId] = null;
    focusBlock(blockId);
  }

  function openCommandPalette() {
    commandReturnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setCommandOpen(true);
    setCommandQuery("");
    setCommandStatus("");
    setActiveCommandIndex(0);
    window.setTimeout(() => commandInputRef.current?.focus(), 0);
  }

  function closeCommandPalette({ restoreFocus = true } = {}) {
    commandDialogRef.current?.close();
    setCommandOpen(false);
    setCommandQuery("");
    setCommandStatus("");
    if (!restoreFocus) return;
    window.setTimeout(() => {
      if (commandReturnFocusRef.current?.isConnected) {
        commandReturnFocusRef.current.focus();
      } else if (focusedBlockId) {
        blockRefs.current[focusedBlockId]?.focus();
      }
    }, 0);
  }

  function runCommand(command: BlockCommand | undefined) {
    if (!command) return;
    insertBlockAfter(focusedBlockId ?? blocks[blocks.length - 1]?.id ?? null, command);
    closeCommandPalette({ restoreFocus: false });
  }

  function onCommandDialogKeyDown(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCommandPalette();
    }
    if (event.key === "Tab") {
      const focusable = Array.from(
        commandDialogRef.current?.querySelectorAll<HTMLElement>(
          'button, input, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((item) => !item.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function onCommandInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveCommandIndex((current) =>
        filteredCommands.length ? (current + 1) % filteredCommands.length : 0
      );
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveCommandIndex((current) =>
        filteredCommands.length
          ? (current - 1 + filteredCommands.length) % filteredCommands.length
          : 0
      );
    }
    if (event.key === "Home" && filteredCommands.length > 0) {
      event.preventDefault();
      setActiveCommandIndex(0);
    }
    if (event.key === "End" && filteredCommands.length > 0) {
      event.preventDefault();
      setActiveCommandIndex(filteredCommands.length - 1);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      runCommand(activeCommand);
    }
  }

  function clearAllBlocks() {
    clearSnapshotRef.current = blocks;
    const fresh = createBlock();
    setBlocks([fresh]);
    setSelectedBlockId(null);
    setAllBlocksSelected(false);
    setFocusedBlockId(fresh.id);
    focusBlock(fresh.id, "start");
    announce("All blocks cleared.");
  }

  function selectedClipboardBlocks() {
    if (allBlocksSelected) return blocks;
    if (selectedBlockId) {
      return blocks.filter((block) => block.id === selectedBlockId);
    }
    return [];
  }

  function onBlockCopy(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const selected = selectedClipboardBlocks();
    if (selected.length === 0) return;
    event.preventDefault();
    event.clipboardData.setData("text/plain", blocksToPlainText(selected));
    event.clipboardData.setData("text/html", blocksToHtml(selected));
    announce(
      `${selected.length} block${selected.length === 1 ? "" : "s"} copied.`
    );
  }

  function onBlockCut(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const selected = selectedClipboardBlocks();
    if (selected.length === 0) return;
    onBlockCopy(event);
    if (allBlocksSelected) {
      clearAllBlocks();
      return;
    }
    if (selectedBlockId) removeBlock(selectedBlockId);
  }

  function onBlockKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    block: EditorBlock
  ) {
    const mod = event.metaKey || event.ctrlKey;
    const blockIndex = blocks.findIndex((item) => item.id === block.id);

    // Undo a just-cleared "select all + delete" — only while the editor is
    // still the single empty block we created (so typed content isn't clobbered).
    if (
      mod &&
      event.key.toLowerCase() === "z" &&
      clearSnapshotRef.current &&
      blocks.length === 1 &&
      !blocks[0].text.trim()
    ) {
      event.preventDefault();
      const snapshot = clearSnapshotRef.current;
      clearSnapshotRef.current = null;
      setBlocks(snapshot);
      setAllBlocksSelected(false);
      setFocusedBlockId(snapshot[0]?.id ?? null);
      announce("Blocks restored.");
      return;
    }

    if (selectedBlockId === block.id) {
      if (event.key === "Delete" || event.key === "Backspace") {
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
      if (event.key === "Delete" || event.key === "Backspace") {
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
      // Any other (non-modifier) key cancels the all-blocks selection and is
      // then handled normally below.
      if (!mod) setAllBlocksSelected(false);
    }

    // Two-step Cmd/Ctrl+A: first selects the current block, second selects the
    // whole editor canvas for deletion.
    if (mod && event.key.toLowerCase() === "a") {
      event.preventDefault();
      if (selectedBlockId === block.id) {
        setSelectedBlockId(null);
        setAllBlocksSelected(true);
        announce("All blocks selected.");
      } else {
        setSelectedBlockId(block.id);
        setAllBlocksSelected(false);
        announce(`Block ${blockIndex + 1} selected.`);
      }
      return;
    }

    if (event.key === "/" && event.currentTarget.selectionStart === 0) {
      event.preventDefault();
      openBlockMenu(block.id);
      return;
    }

    if (
      event.key === "Backspace" &&
      !event.shiftKey &&
      !event.altKey &&
      !event.metaKey &&
      !event.ctrlKey &&
      block.type === "paragraph" &&
      event.currentTarget.value.length === 0 &&
      event.currentTarget.selectionStart === 0 &&
      event.currentTarget.selectionEnd === 0
    ) {
      event.preventDefault();
      if (blocks.length > 1) {
        removeBlock(block.id);
      } else {
        announce("The only block was cleared.");
      }
      return;
    }

    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.altKey &&
      !event.metaKey &&
      !event.ctrlKey &&
      block.type !== "bulleted-list" &&
      block.type !== "numbered-list"
    ) {
      event.preventDefault();
      const target = event.currentTarget;
      const before = target.value.slice(0, target.selectionStart);
      const after = target.value.slice(target.selectionEnd);
      updateBlock(block.id, { text: before });
      insertBlockAfter(block.id, blockCommands[0], after, false);
      return;
    }

    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

    const target = event.currentTarget;
    const atStart = target.selectionStart === 0 && target.selectionEnd === 0;
    const atEnd =
      target.selectionStart === target.value.length &&
      target.selectionEnd === target.value.length;

    if (event.key === "ArrowUp" && atStart && blockIndex > 0) {
      event.preventDefault();
      focusBlock(blocks[blockIndex - 1].id, "end");
    }
    if (event.key === "ArrowDown" && atEnd && blockIndex < blocks.length - 1) {
      event.preventDefault();
      focusBlock(blocks[blockIndex + 1].id, "start");
    }
  }

  function onBlockPaste(
    event: React.ClipboardEvent<HTMLTextAreaElement>,
    block: EditorBlock
  ) {
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const parsed = html
      ? blocksFromHtml(html)
      : looksStructuredMarkdown(text)
        ? blocksFromMarkdown(text)
        : [];

    if (parsed.length === 0) return;
    event.preventDefault();
    replaceBlockWithBlocks(block.id, parsed);
  }

  function onMenuKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
    blockId: string
  ) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveBlockTypeIndex((current) => (current + 1) % blockCommands.length);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveBlockTypeIndex(
        (current) => (current - 1 + blockCommands.length) % blockCommands.length
      );
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveBlockTypeIndex(0);
    }
    if (event.key === "End") {
      event.preventDefault();
      setActiveBlockTypeIndex(blockCommands.length - 1);
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectBlockType(blockId, blockCommands[activeBlockTypeIndex]);
    }
    if (event.key === "Tab") {
      setOpenMenuBlockId(null);
      menuReturnFocusRefs.current[blockId] = null;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeBlockMenu(blockId);
    }
  }

  function validateAccessibility() {
    let previousHeadingLevel = 1;
    for (const [index, block] of blocks.entries()) {
      if (
        block.type === "image" &&
        safeHref(block.url ?? "") &&
        !block.decorative &&
        !block.alt?.trim()
      ) {
        return {
          blockId: block.id,
          field: "image-alt" as const,
          message:
            "An image block is missing alt text. Add an image description before saving."
        };
      }

      if (block.type !== "heading" || !block.text.trim()) continue;

      const level = block.level ?? 2;
      if (level === 1) {
        return {
          blockId: block.id,
          field: "content" as const,
          message:
            "Body headings must start at H2 because the post title is already the page H1."
        };
      }
      if (level > previousHeadingLevel + 1) {
        return {
          blockId: block.id,
          field: "content" as const,
          message:
            `This heading skips from H${previousHeadingLevel} to H${level}. Use H${previousHeadingLevel + 1} or a lower heading level before saving.`
        };
      }
      previousHeadingLevel = level;
    }

    return findMarkdownLinkIssue(blocks);
  }

  function firstBodyTarget() {
    const firstBlock = blocks[0];
    if (!firstBlock) return null;
    return {
      blockId: firstBlock.id,
      field: firstBlock.type === "image" ? "image-url" : "content"
    } as const;
  }

  function removeFeatured() {
    setFeaturedUrl("");
    setFeaturedAlt("");
    setFeaturedDecorative(false);
    if (invalidField === "alt") setInvalidField(null);
  }

  async function onFeaturedChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      setFeaturedUrl(await uploadImage(file));
      setFeaturedDecorative(false);
      announce("Featured image uploaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onBlockImageChange(
    blockId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      updateBlock(blockId, { url: await uploadImage(file) });
      announce("Image uploaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInvalidField(null);
    setInvalidTarget(null);
    if (!title.trim()) {
      fail("title", "Please enter a title.");
      return;
    }
    if (
      !blocks.some((block) =>
        block.type === "image" ? safeHref(block.url ?? "") : block.text.trim()
      )
    ) {
      setInvalidTarget(firstBodyTarget());
      fail("body", "Please enter the post body.");
      return;
    }
    const accessibilityIssue = validateAccessibility();
    if (accessibilityIssue) {
      setInvalidTarget({
        blockId: accessibilityIssue.blockId,
        field: accessibilityIssue.field
      });
      fail("body", accessibilityIssue.message);
      if (accessibilityIssue.field === "image-alt") {
        focusImageAlt(accessibilityIssue.blockId);
      } else if (accessibilityIssue.field === "caption") {
        focusCaption(accessibilityIssue.blockId);
      } else {
        focusBlock(accessibilityIssue.blockId);
      }
      return;
    }
    if (featuredUrl && !featuredDecorative && !featuredAlt.trim()) {
      fail(
        "alt",
        "Please describe the featured image, or mark it as decorative."
      );
      return;
    }
    setSaving(true);
    announce("Saving post.");
    try {
      await createPost({
        title,
        html: blocksToHtml(blocks),
        featuredImageUrl: featuredUrl || null,
        featuredImageAlt: featuredDecorative ? "" : featuredAlt || null,
        categoryIds: selectedCategoryId ? [Number(selectedCategoryId)] : [],
        status: submitStatusRef.current
      });
    } catch (err) {
      if (isRedirect(err)) throw err; // successful redirect from the action
      setSaving(false);
      setError(err instanceof Error ? err.message : "Failed to save the post.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="wp-article space-y-5">
        <div>
          <label htmlFor={titleId} className="block text-sm font-semibold">
            Title
          </label>
          <input
            id={titleId}
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              // Plain Enter in the single-line title must NOT submit the form
              // (that fired the "enter the post body" validation). Instead move
              // focus into the body — a blank first block on a new post.
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.metaKey &&
                !e.ctrlKey &&
                !e.altKey
              ) {
                e.preventDefault();
                const first = blocks[0];
                if (first) {
                  focusBlock(first.id, "start");
                } else {
                  insertBlockAfter(null, blockCommands[0], "", false);
                }
              }
            }}
            required
            aria-invalid={invalidField === "title" || undefined}
            aria-describedby={invalidField === "title" ? errorId : undefined}
            className="mt-1 w-full rounded-md border border-[#6b6b6b] bg-white px-3 py-2 text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
          />
        </div>

        <fieldset className="space-y-3">
          <legend>
            <h2
              id="featured-image-heading"
              className="text-sm font-semibold"
            >
              Featured image (optional)
            </h2>
          </legend>
          {featuredUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={featuredUrl}
              alt={featuredAlt || ""}
              className="max-h-48 rounded-md border border-[#767676]"
            />
          ) : null}
          <div>
            <label htmlFor={fileId} className="block text-sm">
              Choose an image
            </label>
            <input
              id={fileId}
              type="file"
              accept="image/*"
              onChange={onFeaturedChange}
              className="mt-1 block rounded-md text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#0066bf] file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
            />
          </div>
          <div aria-live="polite">
            {uploading ? (
              <p className="text-sm text-[#595959]">Uploading image...</p>
            ) : null}
          </div>
          {featuredUrl ? (
            <div className="space-y-2">
              <div>
                <label htmlFor={altId} className="block text-sm font-semibold">
                  Image description (alt text)
                </label>
                <input
                  id={altId}
                  ref={altRef}
                  value={featuredAlt}
                  disabled={featuredDecorative}
                  onChange={(e) => setFeaturedAlt(e.target.value)}
                  aria-invalid={invalidField === "alt" || undefined}
                  aria-describedby={invalidField === "alt" ? errorId : undefined}
                  className="mt-1 w-full rounded-md border border-[#6b6b6b] bg-white px-3 py-2 text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
                  placeholder="Describe what the image shows"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={featuredDecorative}
                  onChange={(event) => {
                    setFeaturedDecorative(event.target.checked);
                    if (event.target.checked) {
                      setFeaturedAlt("");
                      if (invalidField === "alt") {
                        setInvalidField(null);
                        setError("");
                      }
                    }
                  }}
                  className="h-4 w-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
                />
                This featured image is decorative
              </label>
              <button
                type="button"
                onClick={removeFeatured}
                className="rounded-md border border-[#6b6b6b] px-3 py-1.5 text-sm font-medium text-[#222222] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
              >
                Remove featured image
              </button>
            </div>
          ) : null}
        </fieldset>
      </div>

      <div className="wp-article">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={bodyHeadingId} className="text-lg font-semibold">
            Post body
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowPreview((value) => !value)}
              aria-expanded={showPreview}
              aria-controls={showPreview ? `${baseId}-preview` : undefined}
              className="rounded-md border border-[#6b6b6b] px-3 py-2 text-sm font-semibold hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
            >
              {showPreview ? "Hide preview" : "Show preview"}
            </button>
            <button
              type="button"
              onClick={openCommandPalette}
              aria-expanded={commandOpen}
              aria-haspopup="dialog"
              aria-keyshortcuts="Meta+K Control+K"
              className="inline-flex items-center gap-2 rounded-md border border-[#6b6b6b] px-3 py-2 text-sm font-semibold hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
            >
              Command palette
              {/* Spoken name becomes "Command palette, Command K"; the visible
                  ⌘K glyph is hidden from AT so it isn't read awkwardly. */}
              <span className="sr-only">, Command K</span>
              <kbd
                aria-hidden="true"
                className="rounded border border-[#6b6b6b] bg-slate-100 px-1.5 py-0.5 font-sans text-xs font-medium text-[#595959]"
              >
                ⌘K
              </kbd>
            </button>
          </div>
        </div>
        <p id={bodyHelpId} className="sr-only">
          Type slash at the start of a block to open block choices. Press Enter
          to start a new paragraph block. Use Up and Down arrow at the start or
          end of a block to move between blocks. Use Command K or Control K to
          open the command palette.
        </p>
        <div className="mt-3 space-y-4">
          {blocks.map((block, index) => {
            const blockId = `${baseId}-block-${block.id}`;
            const menuId = `${blockId}-menu`;
            const activeOptionId = `${menuId}-option-${activeBlockTypeIndex}`;
            const imageUrlId = `${blockId}-image-url`;
            const imageFileId = `${blockId}-image-file`;
            const imageAltId = `${blockId}-image-alt`;
            const captionId = `${blockId}-caption`;
            const blockPosition = `${blockLabel(block).toLowerCase()} block ${index + 1} of ${blocks.length}`;
            const isCurrentBlockSelected = selectedBlockId === block.id;
            return (
              <div
                key={block.id}
                className={`rounded-md border bg-white p-3 ${
                  allBlocksSelected || isCurrentBlockSelected
                    ? "border-[#0066bf] ring-2 ring-[#0066bf]"
                    : "border-[#6b6b6b]"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#222222]">
                    {blockLabel(block)}
                  </p>
                  {/* Collapse the 5 per-block controls behind one disclosure so
                      screen-reader users tab past one control per block, not
                      five. Closed by default; contents leave the tab order when
                      collapsed. */}
                  <details className="group">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md border border-[#6b6b6b] px-2.5 py-1 text-sm font-medium hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] [&::-webkit-details-marker]:hidden">
                      Block actions
                      <span className="sr-only"> for {blockPosition}</span>
                    </summary>
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={(event) =>
                          openBlockMenu(block.id, event.currentTarget)
                        }
                        aria-label={`Change type for ${blockPosition}`}
                        aria-haspopup="listbox"
                        aria-expanded={openMenuBlockId === block.id}
                        aria-controls={openMenuBlockId === block.id ? menuId : undefined}
                        className="rounded-md border border-[#6b6b6b] px-2.5 py-1 text-sm font-medium hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
                      >
                        Change type
                      </button>
                      <button
                        type="button"
                        onClick={() => insertBlockAfter(block.id)}
                        aria-label={`Add block after ${blockPosition}`}
                        className="rounded-md border border-[#6b6b6b] px-2.5 py-1 text-sm font-medium hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
                      >
                        Add block
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(block.id, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${blockPosition} up`}
                        className="rounded-md border border-[#6b6b6b] px-2.5 py-1 text-sm font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(block.id, 1)}
                        disabled={index === blocks.length - 1}
                        aria-label={`Move ${blockPosition} down`}
                        className="rounded-md border border-[#6b6b6b] px-2.5 py-1 text-sm font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
                      >
                        Move down
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBlock(block.id)}
                        aria-label={`Remove ${blockPosition}`}
                        className="rounded-md border border-[#6b6b6b] px-2.5 py-1 text-sm font-medium hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
                      >
                        Remove
                      </button>
                    </div>
                  </details>
                </div>

                {block.type === "image" ? (
                  <div className="space-y-3">
                    <div>
                      <label htmlFor={imageFileId} className="block text-sm font-medium">
                        Image file
                      </label>
                      <input
                        id={imageFileId}
                        type="file"
                        accept="image/*"
                        onFocus={() => setFocusedBlockId(block.id)}
                        onChange={(event) => onBlockImageChange(block.id, event)}
                        className="mt-1 block rounded-md text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#0066bf] file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
                      />
                    </div>
                    <div>
                      <label htmlFor={imageUrlId} className="block text-sm font-medium">
                        Image URL
                      </label>
                      <input
                        id={imageUrlId}
                        ref={(node) => {
                          blockRefs.current[block.id] = node;
                        }}
                        value={block.url ?? ""}
                        onFocus={() => setFocusedBlockId(block.id)}
                        onChange={(event) =>
                          updateBlock(block.id, { url: event.target.value })
                        }
                        className="mt-1 w-full rounded-md border border-[#6b6b6b] bg-white px-3 py-2 text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
                        aria-invalid={
                          invalidTarget?.blockId === block.id &&
                          invalidTarget.field === "image-url"
                            ? true
                            : undefined
                        }
                        aria-describedby={describeBodyField(block.id, "image-url")}
                      />
                    </div>
                    <div>
                      <label htmlFor={imageAltId} className="block text-sm font-medium">
                        Image description (alt text)
                      </label>
                      <input
                        id={imageAltId}
                        ref={(node) => {
                          imageAltRefs.current[block.id] = node;
                        }}
                        value={block.alt ?? ""}
                        disabled={block.decorative}
                        onFocus={() => setFocusedBlockId(block.id)}
                        onChange={(event) =>
                          updateBlock(block.id, { alt: event.target.value })
                        }
                        aria-invalid={
                          invalidTarget?.blockId === block.id &&
                          invalidTarget.field === "image-alt"
                            ? true
                            : undefined
                        }
                        aria-describedby={describeBodyField(block.id, "image-alt")}
                        className="mt-1 w-full rounded-md border border-[#6b6b6b] bg-white px-3 py-2 text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(block.decorative)}
                        onChange={(event) => {
                          updateBlock(block.id, {
                            decorative: event.target.checked,
                            alt: event.target.checked ? "" : block.alt
                          });
                          if (
                            event.target.checked &&
                            invalidTarget?.blockId === block.id &&
                            invalidTarget.field === "image-alt"
                          ) {
                            setInvalidField(null);
                            setInvalidTarget(null);
                            setError("");
                          }
                        }}
                        className="h-4 w-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
                      />
                      This image is decorative
                    </label>
                    <div>
                      <label htmlFor={captionId} className="block text-sm font-medium">
                        Caption
                      </label>
                      <textarea
                        id={captionId}
                        ref={(node) => {
                          captionRefs.current[block.id] = node;
                        }}
                        value={block.text}
                        onFocus={() => setFocusedBlockId(block.id)}
                        onChange={(event) =>
                          updateBlock(block.id, { text: event.target.value })
                        }
                        onPaste={(event) => onBlockPaste(event, block)}
                        rows={3}
                        aria-invalid={
                          invalidTarget?.blockId === block.id &&
                          invalidTarget.field === "caption"
                            ? true
                            : undefined
                        }
                        aria-describedby={describeBodyField(block.id, "caption")}
                        className="mt-1 w-full rounded-md border border-[#6b6b6b] bg-white px-3 py-2 text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {block.type === "heading" ? (
                      <div>
                        <label
                          htmlFor={`${blockId}-level`}
                          className="block text-sm font-medium"
                        >
                          Heading level
                        </label>
                        <select
                          id={`${blockId}-level`}
                          value={block.level ?? 2}
                          onFocus={() => setFocusedBlockId(block.id)}
                          onChange={(event) =>
                            updateBlock(block.id, {
                              level: Number(event.target.value) as HeadingLevel
                            })
                          }
                          className="mt-1 rounded-md border border-[#6b6b6b] bg-white px-3 py-2 text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
                        >
                          {[2, 3, 4, 5, 6].map((level) => (
                            <option key={level} value={level}>
                              H{level}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    <label htmlFor={blockId} className="sr-only">
                      Block {index + 1}, {blockLabel(block)}
                    </label>
                    <textarea
                      id={blockId}
                      ref={(node) => {
                        blockRefs.current[block.id] = node;
                      }}
                      value={block.text}
                      onFocus={() => setFocusedBlockId(block.id)}
                      onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                      onKeyDown={(e) => onBlockKeyDown(e, block)}
                      onCopy={onBlockCopy}
                      onCut={onBlockCut}
                      onPaste={(e) => onBlockPaste(e, block)}
                      rows={block.type === "heading" ? 2 : 5}
                      aria-invalid={
                        invalidTarget?.blockId === block.id &&
                        invalidTarget.field === "content"
                          ? true
                          : undefined
                      }
                      aria-describedby={describeBodyField(block.id, "content")}
                      className="w-full rounded-md border border-[#6b6b6b] bg-white px-3 py-2 text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
                    />
                  </div>
                )}

                {openMenuBlockId === block.id ? (
                  <div
                    id={menuId}
                    ref={(node) => {
                      menuRefs.current[block.id] = node;
                    }}
                    role="listbox"
                    tabIndex={0}
                    aria-label={`Choose type for ${blockLabel(block).toLowerCase()} block ${index + 1} of ${blocks.length}`}
                    aria-activedescendant={activeOptionId}
                    onKeyDown={(e) => onMenuKeyDown(e, block.id)}
                    className="mt-2 rounded-md border border-[#6b6b6b] bg-white p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
                  >
                    {blockCommands.map((item, optionIndex) => (
                      <div
                        key={commandKey(item)}
                        id={`${menuId}-option-${optionIndex}`}
                        role="option"
                        aria-selected={optionIndex === activeBlockTypeIndex}
                        onClick={() => selectBlockType(block.id, item)}
                        className={`cursor-pointer rounded px-3 py-2 text-sm ${
                          optionIndex === activeBlockTypeIndex
                            ? "bg-[#0066bf] text-white"
                            : "text-[#222222]"
                        }`}
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {showPreview ? (
          <div
            id={`${baseId}-preview`}
            className="mt-6 rounded-md border border-[#767676] bg-white p-4"
          >
            <h3
              id={`${baseId}-preview-heading`}
              className="mb-3 text-sm font-semibold uppercase text-[#595959]"
            >
              Preview
            </h3>
            <article className="wp-prose">
              {title.trim() ? (
                <p className="text-3xl font-bold text-[#222222]">{title}</p>
              ) : null}
              {/* Author's own content rendered for themselves; uses the same
                  serializer as publishing so markdown previews accurately. */}
              <div
                dangerouslySetInnerHTML={{ __html: blocksToHtml(blocks) }}
              />
            </article>
          </div>
        ) : null}
      </div>

      <div className="wp-article space-y-4">
        <div>
          <label htmlFor={categoryId} className="block text-sm font-semibold">
            Category
          </label>
          <select
            id={categoryId}
            value={selectedCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.currentTarget.blur();
                window.setTimeout(() => {
                  document.getElementById(statusHeadingId)?.focus();
                }, 0);
              }
            }}
            className="mt-1 w-full rounded-md border border-[#6b6b6b] bg-white px-3 py-2 text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
          >
            <option value="">No category selected</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <h2
            id={statusHeadingId}
            tabIndex={-1}
            className="text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
          >
            Status
          </h2>
          <p className="mt-1 text-sm text-[#595959]">
            Save a private draft, or publish when the post is ready to go live.
          </p>
        </div>

        <p id={statusId} role="status" aria-live="polite" className="sr-only">
          {liveMessage}
        </p>
        <p
          id={commandStatusId}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {commandStatus}
        </p>

        <div
          id={errorId}
          role="alert"
          className="min-h-[1.25rem] text-sm font-semibold text-[#b91c1c]"
        >
          {error}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || uploading}
            aria-describedby={statusId}
            onClick={() => {
              submitStatusRef.current = "draft";
              setStatus("draft");
            }}
            className="rounded-md border border-[#767676] bg-white px-5 py-2.5 font-semibold text-[#222222] hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
          >
            {saving && status === "draft" ? "Saving draft..." : "Save draft"}
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            aria-describedby={statusId}
            onClick={() => {
              submitStatusRef.current = "published";
              setStatus("published");
            }}
            className="rounded-md bg-[#0066bf] px-5 py-2.5 font-semibold text-white hover:bg-[#035a9e] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
          >
            {saving && status === "published" ? "Publishing..." : "Publish post"}
          </button>
        </div>
      </div>

      {commandOpen ? (
          <dialog
            id={commandDialogId}
            ref={commandDialogRef}
            aria-modal="true"
            aria-labelledby={commandTitleId}
            onKeyDown={onCommandDialogKeyDown}
            onCancel={(event) => {
              event.preventDefault();
              closeCommandPalette();
            }}
            className="w-full max-w-xl rounded-lg bg-white p-4 shadow-xl backdrop:bg-black/45"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id={commandTitleId} className="text-xl font-semibold">
                Command palette
              </h2>
              <button
                type="button"
                onClick={() => closeCommandPalette()}
                className="rounded-md border border-[#6b6b6b] px-3 py-1.5 text-sm font-semibold hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
              >
                Close
              </button>
            </div>
            <input
              ref={commandInputRef}
              value={commandQuery}
              onChange={(event) => {
                setCommandQuery(event.target.value);
                setActiveCommandIndex(0);
              }}
              onKeyDown={onCommandInputKeyDown}
              role="combobox"
              aria-expanded={filteredCommands.length > 0}
              aria-autocomplete="list"
              aria-controls={filteredCommands.length > 0 ? commandListId : undefined}
              aria-describedby={commandStatusId}
              aria-activedescendant={
                activeCommand ? `${commandListId}-option-${safeActiveCommandIndex}` : undefined
              }
              aria-label="Search commands"
              className="mt-4 w-full rounded-md border border-[#6b6b6b] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
            />
            {filteredCommands.length > 0 ? (
              <div
                id={commandListId}
                role="listbox"
                aria-label="Commands"
                className="mt-3 max-h-72 overflow-auto rounded-md border border-[#6b6b6b] p-1"
              >
                {filteredCommands.map((item, index) => (
                  <div
                    key={commandKey(item)}
                    id={`${commandListId}-option-${index}`}
                    role="option"
                    aria-selected={index === safeActiveCommandIndex}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => runCommand(item)}
                    className={`cursor-pointer rounded px-3 py-2 text-sm ${
                      index === safeActiveCommandIndex
                        ? "bg-[#0066bf] text-white"
                        : "text-[#222222]"
                    }`}
                  >
                    Insert {item.label.toLowerCase()} block
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-md border border-[#6b6b6b] px-3 py-2 text-sm text-[#595959]">
                No matching commands.
              </p>
            )}
          </dialog>
      ) : null}
    </form>
  );
}
