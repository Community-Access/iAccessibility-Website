"use client";

import { useRef } from "react";

export function EventSubscribe({
  icsUrl,
  rssUrl
}: {
  icsUrl: string;
  rssUrl: string;
}) {
  const liveRef = useRef<HTMLParagraphElement>(null);
  const webcalUrl = icsUrl.replace(/^https?:\/\//, "webcal://");

  const linkClass =
    "text-[#0f6cba] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  // Clear then set on the next frame so an identical consecutive message
  // (e.g. pressing Copy twice) still re-announces for assistive tech.
  function announce(message: string) {
    const node = liveRef.current;
    if (!node) return;
    node.textContent = "";
    requestAnimationFrame(() => {
      if (liveRef.current) liveRef.current.textContent = message;
    });
  }

  async function copyFeed() {
    try {
      await navigator.clipboard.writeText(icsUrl);
      announce("Feed URL copied.");
    } catch {
      announce("Copy failed. Select and copy the URL manually.");
    }
  }

  return (
    <div id="subscribe" className="mt-8">
      <h2 className="text-2xl font-semibold">Subscribe to events</h2>
      <ul className="mt-3 space-y-2">
        <li>
          <a href={webcalUrl} className={linkClass}>
            Subscribe in Apple Calendar
          </a>
        </li>
        <li>
          <a href={rssUrl} className={linkClass}>
            Events RSS feed
          </a>
        </li>
        <li>
          <button
            type="button"
            onClick={copyFeed}
            className="rounded-md border border-[#767676] px-3 py-1.5 text-sm font-semibold text-[#222222] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Copy calendar feed URL
          </button>
        </li>
      </ul>
      <p ref={liveRef} role="status" aria-atomic="true" className="sr-only" />
    </div>
  );
}
