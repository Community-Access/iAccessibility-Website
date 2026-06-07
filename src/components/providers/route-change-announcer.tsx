"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { useAnnouncer } from "./announcer";

/**
 * Shared SPA route-change focus + announce (foundation contract section 1,
 * AC-5). On every client navigation it:
 *   1. moves keyboard focus to the new page's <h1> (or the <main> landmark when
 *      a page omits one), so the user lands at the top of the new content
 *      instead of stranded on the old link, and
 *   2. announces the new page title politely, since an SPA route change is
 *      silent to assistive tech by default.
 *
 * It deliberately skips the very first render: the initial page load is
 * announced by the browser itself and already has a sensible focus point, so
 * re-announcing/refocusing on mount would be redundant and disruptive.
 */
export function RouteChangeAnnouncer() {
  const pathname = usePathname();
  const { announce } = useAnnouncer();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Defer one frame so the new route's DOM (its <h1> / <main>) has rendered
    // before we move focus and read the title.
    const raf = requestAnimationFrame(() => {
      const main = document.getElementById("main-content");
      const heading = main?.querySelector("h1") ?? document.querySelector("h1");
      const target = (heading as HTMLElement | null) ?? main;

      if (target) {
        // <main> already carries tabindex=-1; give a transient h1 one too so it
        // can receive focus, then move focus without scrolling the viewport
        // (the skip-link / scroll-margin handle positioning). Strip the
        // transient tabindex once focus leaves the heading so it doesn't linger
        // as a stray tab stop in the document.
        if (target !== main && !target.hasAttribute("tabindex")) {
          target.setAttribute("tabindex", "-1");
          target.addEventListener(
            "blur",
            () => target.removeAttribute("tabindex"),
            { once: true },
          );
        }
        target.focus({ preventScroll: true });
      }

      // Prefer the visible page heading, fall back to the document title.
      const title = heading?.textContent?.trim() || document.title;
      if (title) announce(title, "polite");
    });

    return () => cancelAnimationFrame(raf);
  }, [pathname, announce]);

  return null;
}
