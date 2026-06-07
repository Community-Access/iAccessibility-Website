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

type InvalidTarget = {
  blockId: string;
  field: "content" | "image-url" | "image-alt" | "caption";
} | null;

const blockCommands: BlockCommand[] = [
  { type: "paragraph", label: "Paragraph" },
  { type: "heading", label: "Heading 1", level: 1 },
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

export default function PostEditor() {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const bodyHeadingId = `${baseId}-body-heading`;
  const bodyHelpId = `${baseId}-body-help`;
  const fileId = `${baseId}-file`;
  const altId = `${baseId}-alt`;
  const errorId = `${baseId}-error`;
  const statusId = `${baseId}-status`;
  const commandTitleId = `${baseId}-command-title`;
  const commandDialogId = `${baseId}-command-dialog`;
  const commandListId = `${baseId}-command-list`;

  const titleRef = useRef<HTMLInputElement>(null);
  const blockRefs = useRef<Record<string, HTMLElement | null>>({});
  const imageAltRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const captionRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const altRef = useRef<HTMLInputElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const commandDialogRef = useRef<HTMLDialogElement>(null);

  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => [createBlock()]);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [featuredUrl, setFeaturedUrl] = useState("");
  const [featuredAlt, setFeaturedAlt] = useState("");
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
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);
  const [commandStatus, setCommandStatus] = useState("");
  const commandReturnFocusRef = useRef<HTMLElement | null>(null);
  const liveMessageTimerRef = useRef<number | null>(null);

  const filteredCommands = blockCommands.filter((item) =>
    item.label.toLowerCase().includes(commandQuery.trim().toLowerCase())
  );
  const safeActiveCommandIndex = Math.min(
    activeCommandIndex,
    Math.max(filteredCommands.length - 1, 0)
  );
  const activeCommand = filteredCommands[safeActiveCommandIndex];

  useEffect(() => {
    if (!commandOpen) return;
    setCommandStatus(
      filteredCommands.length === 0
        ? "No matching commands."
        : `${filteredCommands.length} command${filteredCommands.length === 1 ? "" : "s"} available.`
    );
  }, [commandOpen, filteredCommands.length]);

  useEffect(() => {
    if (!commandOpen || !commandDialogRef.current) return;
    if (!commandDialogRef.current.open) {
      commandDialogRef.current.showModal();
    }
  }, [commandOpen]);

  useEffect(() => {
    function onWindowKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openCommandPalette();
      }
    }
    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  });

  useEffect(() => {
    return () => {
      if (liveMessageTimerRef.current) {
        window.clearTimeout(liveMessageTimerRef.current);
      }
    };
  }, []);

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

  function focusBlock(blockId: string) {
    window.setTimeout(() => blockRefs.current[blockId]?.focus(), 0);
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
    const ids = field === "content" ? [bodyHelpId] : [];
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
    command: BlockCommand = blockCommands[0]
  ) {
    const nextBlock = createBlock(command.type, command.level);
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
    announce(`${command.label} block added.`);
    focusBlock(nextBlock.id);
  }

  function removeBlock(blockId: string) {
    setBlocks((current) => {
      if (current.length === 1) {
        announce("The only block was cleared.");
        return [{ ...current[0], text: "", type: "paragraph", url: "", alt: "" }];
      }
      const index = current.findIndex((block) => block.id === blockId);
      const next = current.filter((block) => block.id !== blockId);
      const focusTarget = next[Math.min(index, next.length - 1)];
      if (focusTarget) focusBlock(focusTarget.id);
      announce(`Block removed. ${next.length} block${next.length === 1 ? "" : "s"} remaining.`);
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

  function openBlockMenu(blockId: string) {
    setOpenMenuBlockId(blockId);
    setActiveBlockTypeIndex(0);
    announce("Block inserter opened.");
    focusMenu(blockId);
  }

  function closeBlockMenu(blockId: string) {
    setOpenMenuBlockId(null);
    focusBlock(blockId);
  }

  function selectBlockType(blockId: string, command: BlockCommand) {
    updateBlock(blockId, { type: command.type, level: command.level });
    setOpenMenuBlockId(null);
    announce(`${command.label} selected.`);
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

  function closeCommandPalette() {
    commandDialogRef.current?.close();
    setCommandOpen(false);
    setCommandQuery("");
    setCommandStatus("");
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
    closeCommandPalette();
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
    if (event.key === "Enter") {
      event.preventDefault();
      runCommand(activeCommand);
    }
  }

  function onBlockKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    block: EditorBlock
  ) {
    if (event.key === "/" && event.currentTarget.selectionStart === 0) {
      event.preventDefault();
      openBlockMenu(block.id);
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
    if (event.key === "Enter") {
      event.preventDefault();
      selectBlockType(blockId, blockCommands[activeBlockTypeIndex]);
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
          message: `Block ${index + 1} is an image without alt text. Add an image description before saving.`
        };
      }

      if (block.type !== "heading" || !block.text.trim()) continue;

      const level = block.level ?? 2;
      if (level === 1) {
        return {
          blockId: block.id,
          field: "content" as const,
          message:
            `Block ${index + 1} is an H1. The post title is already the page H1, so body headings must start at H2.`
        };
      }
      if (level > previousHeadingLevel + 1) {
        return {
          blockId: block.id,
          field: "content" as const,
          message:
            `Block ${index + 1} skips from H${previousHeadingLevel} to H${level}. Use H${previousHeadingLevel + 1} or a lower heading level before saving.`
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
    if (invalidField === "alt") setInvalidField(null);
  }

  async function onFeaturedChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      setFeaturedUrl(await uploadImage(file));
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
    if (featuredUrl && !featuredAlt.trim()) {
      fail(
        "alt",
        "Please describe the featured image (alt text) so it is accessible."
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
        featuredImageAlt: featuredAlt || null,
        status
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
            required
            aria-invalid={invalidField === "title" || undefined}
            aria-describedby={invalidField === "title" ? errorId : undefined}
            className="mt-1 w-full rounded-md border border-[#6b6b6b] bg-white px-3 py-2 text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">
            Featured image (optional)
          </legend>
          {featuredUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={featuredUrl}
              alt={featuredAlt || ""}
              className="max-h-48 rounded-md border border-border"
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
                  onChange={(e) => setFeaturedAlt(e.target.value)}
                  aria-invalid={invalidField === "alt" || undefined}
                  aria-describedby={invalidField === "alt" ? errorId : undefined}
                  className="mt-1 w-full rounded-md border border-[#6b6b6b] bg-white px-3 py-2 text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
                  placeholder="Describe what the image shows"
                />
              </div>
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
          <button
            type="button"
            onClick={openCommandPalette}
            aria-haspopup="dialog"
            aria-expanded={commandOpen}
            aria-controls={commandOpen ? commandDialogId : undefined}
            className="rounded-md border border-[#6b6b6b] px-3 py-2 text-sm font-semibold hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
          >
            Command palette
          </button>
        </div>
        <p id={bodyHelpId} className="sr-only">
          Type slash at the start of a block to open block choices. Use Up and
          Down arrows to review choices, Enter to select, and Escape to close.
          Use Command K or Control K to open the command palette. The post
          title is the page H1, so body H1 blocks cannot be saved.
        </p>
        <div
          role="group"
          aria-labelledby={bodyHeadingId}
          aria-describedby={bodyHelpId}
          className="mt-3 space-y-4"
        >
          {blocks.map((block, index) => {
            const blockId = `${baseId}-block-${block.id}`;
            const menuId = `${blockId}-menu`;
            const activeOptionId = `${menuId}-option-${activeBlockTypeIndex}`;
            const imageUrlId = `${blockId}-image-url`;
            const imageFileId = `${blockId}-image-file`;
            const imageAltId = `${blockId}-image-alt`;
            const captionId = `${blockId}-caption`;
            return (
              <div
                key={block.id}
                className="rounded-md border border-[#6b6b6b] bg-white p-3"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#222222]">
                    Block {index + 1}, {blockLabel(block)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openBlockMenu(block.id)}
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
                      className="rounded-md border border-[#6b6b6b] px-2.5 py-1 text-sm font-medium hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
                    >
                      Add block
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(block.id, -1)}
                      disabled={index === 0}
                      className="rounded-md border border-[#6b6b6b] px-2.5 py-1 text-sm font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(block.id, 1)}
                      disabled={index === blocks.length - 1}
                      className="rounded-md border border-[#6b6b6b] px-2.5 py-1 text-sm font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
                    >
                      Move down
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="rounded-md border border-[#6b6b6b] px-2.5 py-1 text-sm font-medium hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
                    >
                      Remove
                    </button>
                  </div>
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
                        onChange={(event) =>
                          updateBlock(block.id, {
                            decorative: event.target.checked,
                            alt: event.target.checked ? "" : block.alt
                          })
                        }
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
                          {[1, 2, 3, 4, 5, 6].map((level) => (
                            <option key={level} value={level}>
                              H{level}
                              {level === 1 ? " (blocked in body)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    <label htmlFor={blockId} className="sr-only">
                      Block {index + 1}, {blockLabel(block)} content
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
                    aria-label={`Choose type for block ${index + 1}`}
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
      </div>

      <div className="wp-article space-y-4">
        <fieldset>
          <legend className="text-sm font-semibold">Status</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="post-status"
                checked={status === "draft"}
                onChange={() => setStatus("draft")}
              />
              Save as draft
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="post-status"
                checked={status === "published"}
                onChange={() => setStatus("published")}
              />
              Publish now
            </label>
          </div>
        </fieldset>

        <p id={statusId} role="status" aria-live="polite" className="sr-only">
          {liveMessage}
        </p>

        <div
          id={errorId}
          role="alert"
          className="min-h-[1.25rem] text-sm font-semibold text-[#b91c1c]"
        >
          {error}
        </div>

        <button
          type="submit"
          disabled={saving || uploading}
          aria-describedby={statusId}
          className="rounded-md bg-[#0066bf] px-5 py-2.5 font-semibold text-white hover:bg-[#035a9e] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
        >
          {saving ? "Saving..." : "Save post"}
        </button>
      </div>

      {commandOpen ? (
          <dialog
            id={commandDialogId}
            ref={commandDialogRef}
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
                onClick={closeCommandPalette}
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
              aria-activedescendant={
                activeCommand ? `${commandListId}-option-${safeActiveCommandIndex}` : undefined
              }
              aria-label="Search commands"
              className="mt-4 w-full rounded-md border border-[#6b6b6b] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
            />
            <p role="status" aria-live="polite" className="sr-only">
              {commandStatus}
            </p>
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
