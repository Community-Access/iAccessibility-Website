"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Native HTML5 <audio controls> podcast player + accessible page chrome.
 *
 * HARD RULE (docs/accessibility-foundation.md section 7): the native
 * <audio controls> element is the ONLY player. We do not build custom
 * play/pause/seek/speed UI — the browser's built-in controls are already
 * keyboard-operable and expose playback speed in their native overflow menu.
 * Everything else here is page chrome around that native element.
 *
 * Props map to the podcast_episodes schema (src/db/schema.ts). Artwork is not
 * an episode field; it is resolved from the show's cover art by the caller and
 * passed in as a public-read URL + alt.
 */

/** A block of rich content (show notes / transcript) supplied by the caller. */
type RichContent =
  | { html: string; children?: never }
  | { children: ReactNode; html?: never };

export interface PodcastPlayerProps {
  /** Episode title. Rendered as the page <h1> and woven into the audio label. */
  title: string;
  /**
   * Public-read HTTPS enclosure URL for the audio (podcast_episodes.enclosureUrl).
   * Required for the player to do anything.
   */
  enclosureUrl: string;
  /** MIME type of the audio, e.g. "audio/mpeg" (podcast_episodes.mime). */
  mime?: string | null;
  /** Enclosure size in bytes (podcast_episodes.byteLength). Shown human-readable. */
  byteLength?: number | null;
  /** Spaces object key (podcast_episodes.spacesKey) — used to name the download file. */
  spacesKey?: string | null;
  /** Duration in seconds (podcast_episodes.durationSeconds). Captioned under the player. */
  durationSeconds?: number | null;

  /**
   * Show notes (podcast_episodes.showNotes). Either pre-sanitized HTML or React
   * nodes. Internal headings MUST start at <h3> (the section heading is <h2>).
   */
  showNotes?: RichContent | null;

  /**
   * Transcript (podcast_episodes.transcript). Inline transcript as pre-sanitized
   * HTML or React nodes -> rendered behind a disclosure. Internal headings start
   * at <h3>. If the transcript lives in a separate file, pass `transcriptUrl`
   * instead and a descriptive link is rendered.
   */
  transcript?: RichContent | null;
  /** URL of a standalone transcript file, used instead of an inline transcript. */
  transcriptUrl?: string | null;

  /** Resolved public-read cover-art URL (from the show). Optional. */
  artworkUrl?: string | null;
  /**
   * Alt text for the artwork. Pass meaningful context, or "" for decorative.
   * Defaults to "" because the episode title is the adjacent <h1> (section 7).
   */
  artworkAlt?: string;

  className?: string;
}

/** Human-readable byte size, e.g. 31457280 -> "30 MB". */
function formatBytes(bytes: number): string {
  const units = ["bytes", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = unit === 0 ? value : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

/** Friendly audio format label from a MIME type, e.g. "audio/mpeg" -> "MP3". */
function formatLabel(mime?: string | null): string {
  switch (mime) {
    case "audio/mpeg":
    case "audio/mp3":
      return "MP3";
    case "audio/mp4":
    case "audio/x-m4a":
    case "audio/aac":
      return "M4A";
    case "audio/ogg":
    case "audio/opus":
      return "OGG";
    case "audio/wav":
    case "audio/x-wav":
      return "WAV";
    default:
      return "audio";
  }
}

/** hh:mm:ss / mm:ss from seconds, e.g. 3725 -> "1:02:05". */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Derive a download filename from the Spaces key or enclosure URL. */
function downloadName(spacesKey?: string | null, url?: string): string | undefined {
  const source = spacesKey || url;
  if (!source) return undefined;
  const last = source.split("/").pop();
  return last && last.length > 0 ? last : undefined;
}

/** Render rich content as pre-sanitized HTML or as React children. */
function RichBody({ content }: { content: RichContent }) {
  if ("html" in content && content.html != null) {
    // Caller is responsible for sanitizing this HTML server-side before it
    // reaches the component (no client sanitizer is bundled).
    return (
      <div
        className="prose-content"
        dangerouslySetInnerHTML={{ __html: content.html }}
      />
    );
  }
  return <div className="prose-content">{content.children}</div>;
}

export function PodcastPlayer({
  title,
  enclosureUrl,
  mime,
  byteLength,
  spacesKey,
  durationSeconds,
  showNotes,
  transcript,
  transcriptUrl,
  artworkUrl,
  artworkAlt = "",
  className,
}: PodcastPlayerProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const transcriptRegionId = useId();

  const sizePart =
    typeof byteLength === "number" && byteLength > 0
      ? `, ${formatBytes(byteLength)}`
      : "";
  const downloadText = `Download episode (${formatLabel(mime)}${sizePart})`;

  return (
    <article className={cn("flex flex-col gap-6", className)}>
      {/* One H1 per page = the episode title (section 7). */}
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        {title}
      </h1>

      {artworkUrl ? (
        // Episode artwork is provider-hosted and not enumerated in next.config
        // remotePatterns; a plain decorative <img> keeps it host-agnostic.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={artworkUrl}
          // Defaults to alt="" because the title above is the adjacent heading.
          alt={artworkAlt}
          className="h-auto w-full max-w-sm rounded-lg border"
        />
      ) : null}

      {/*
        The player itself: native controls ONLY. The label names the episode so
        a screen reader announces "Audio player: {title}". color-scheme on the
        document makes the native control render per theme.
      */}
      <div className="flex flex-col gap-2">
        <audio
          controls
          preload="metadata"
          aria-label={`Audio player: ${title}`}
          className="w-full"
        >
          <source src={enclosureUrl} type={mime ?? undefined} />
          Your browser does not support the audio element.{" "}
          <a href={enclosureUrl}>Download the audio file</a> to listen.
        </audio>

        {typeof durationSeconds === "number" && durationSeconds > 0 ? (
          <p className="text-sm text-muted-foreground">
            Duration: {formatDuration(durationSeconds)}
          </p>
        ) : null}
      </div>

      {/*
        Explicit, descriptive download link, separate from the player. The
        `download` attribute asks the browser to save rather than navigate.
      */}
      <p>
        <a
          href={enclosureUrl}
          download={downloadName(spacesKey, enclosureUrl)}
          className="inline-flex min-h-[44px] items-center"
        >
          {downloadText}
        </a>
      </p>

      {showNotes ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold text-foreground">Show notes</h2>
          <RichBody content={showNotes} />
        </div>
      ) : null}

      {/* Transcript: inline disclosure, OR a descriptive link to a separate file. */}
      {transcript || transcriptUrl ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold text-foreground">Transcript</h2>

          {transcript ? (
            <>
              <button
                type="button"
                aria-expanded={transcriptOpen}
                aria-controls={transcriptRegionId}
                onClick={() => setTranscriptOpen((open) => !open)}
                className="inline-flex min-h-[44px] w-fit items-center rounded-md border bg-background px-4 py-2 text-foreground hover:bg-muted"
              >
                {transcriptOpen ? "Hide transcript" : "Show transcript"}
              </button>
              {/*
                Region stays in normal reading order under the h2; hidden when
                collapsed so it is removed from the a11y tree and tab order.
              */}
              <div id={transcriptRegionId} hidden={!transcriptOpen}>
                <RichBody content={transcript} />
              </div>
            </>
          ) : (
            <p>
              <a
                href={transcriptUrl ?? undefined}
                className="inline-flex min-h-[44px] items-center"
              >
                Read the full transcript for {title}
              </a>
            </p>
          )}
        </div>
      ) : null}
    </article>
  );
}

export default PodcastPlayer;
