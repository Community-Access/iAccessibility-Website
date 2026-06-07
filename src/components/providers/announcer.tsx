"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Site-wide screen-reader announcer (foundation contract section 1, AC-5).
 *
 * Two always-mounted live regions back a single `announce()` call:
 *   - polite (role="status", aria-live="polite") for non-urgent updates such as
 *     SPA route-change titles, table sort/filter results, async "loaded".
 *   - assertive (role="alert", aria-live="assertive") for things that must
 *     interrupt, e.g. a submit-time form error summary.
 *
 * Re-announcing identical text is the tricky part: assistive tech only speaks a
 * live region when its text CHANGES, so repeating the same string is silent. We
 * clear the region first, then set the new text on a short timer, which forces a
 * change even when the message matches the previous one.
 *
 * The shell mounts exactly one provider; everything that needs to talk to the
 * user calls `useAnnouncer().announce(...)`.
 */

interface AnnouncerContextValue {
  announce: (message: string, priority?: "polite" | "assertive") => void;
}

const AnnouncerContext = createContext<AnnouncerContextValue | null>(null);

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");
  const politeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assertiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      if (priority === "assertive") {
        // Drop any pending assertive announcement, then clear-and-set so the
        // same text re-announces.
        if (assertiveTimerRef.current) clearTimeout(assertiveTimerRef.current);
        setAssertiveMessage("");
        assertiveTimerRef.current = setTimeout(() => {
          setAssertiveMessage(message);
          assertiveTimerRef.current = null;
        }, 100);
      } else {
        if (politeTimerRef.current) clearTimeout(politeTimerRef.current);
        setPoliteMessage("");
        politeTimerRef.current = setTimeout(() => {
          setPoliteMessage(message);
          politeTimerRef.current = null;
        }, 100);
      }
    },
    [],
  );

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      {/* Live regions for screen-reader announcements; visually hidden. */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {politeMessage}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
}

export function useAnnouncer(): AnnouncerContextValue {
  const context = useContext(AnnouncerContext);
  if (!context) {
    // No-op outside a provider (e.g. during SSR / isolated tests) so callers
    // never have to null-check.
    return { announce: () => {} };
  }
  return context;
}
