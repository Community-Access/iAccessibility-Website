"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * Non-modal, accessible cookie-consent banner (foundation contract section 5).
 *
 * Deliberately NOT a focus-trapping modal: the page stays fully operable while
 * the banner is shown. It is a role="dialog" landmark labelled "Cookie
 * consent", keyboard-reachable, with Escape mapped to Decline. On appear it
 * announces itself politely via its own live region (the site-wide announcer is
 * owned by the app shell and isn't a dependency here). The choice persists in
 * localStorage and, once made, the banner never reappears on its own — a footer
 * "Cookie preferences" control reopens it.
 *
 * Analytics are gated entirely behind an explicit Accept: nothing loads until
 * the visitor accepts, and Decline is honored. The GA injection point is the
 * clearly-marked hook in `loadAnalytics()` below (no measurement id wired yet).
 */

const STORAGE_KEY = "ia-cookie-consent";
const REOPEN_EVENT = "ia:open-cookie-preferences";

type Consent = "accepted" | "declined";

function readStoredConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "accepted" || value === "declined" ? value : null;
  } catch {
    // Private mode / storage disabled — treat as "no choice yet".
    return null;
  }
}

function writeStoredConsent(consent: Consent) {
  try {
    window.localStorage.setItem(STORAGE_KEY, consent);
  } catch {
    // Best-effort; a non-persisted choice just means the banner returns later.
  }
}

/**
 * Load analytics. Called only after an explicit Accept (on click and, on later
 * loads, when a stored "accepted" choice is found). Idempotent so repeat calls
 * are safe.
 *
 * ANALYTICS HOOK — wire the Google Analytics snippet here once a measurement id
 * exists. Nothing in this function should run before consent === "accepted".
 */
let analyticsLoaded = false;
function loadAnalytics() {
  if (analyticsLoaded) return;
  analyticsLoaded = true;

  // ---------------------------------------------------------------------------
  // TODO(analytics): inject the Google Analytics (gtag.js) snippet here.
  // Left intentionally empty — no GA measurement id is configured yet. When the
  // id lands, append the gtag <script> and initialize it from inside this
  // guard so it is reached only on consent === "accepted".
  // ---------------------------------------------------------------------------
}

/**
 * Open the cookie preferences banner from anywhere (e.g. a footer link):
 * dispatch the reopen event this component listens for.
 */
export function openCookiePreferences() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(REOPEN_EVENT));
}

/**
 * Footer control to reopen the banner. Renders a real <button> so it is
 * keyboard-operable and announced as a button; place it in the site footer.
 */
export function CookiePreferencesButton({
  className,
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={openCookiePreferences}
      className={
        className ??
        "min-h-[44px] text-sm text-foreground underline underline-offset-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      }
    >
      Cookie preferences
    </button>
  );
}

export function CookieConsent() {
  // null = undecided this render; once we read storage we either show the
  // banner (no stored choice) or stay hidden.
  const [visible, setVisible] = useState(false);
  // Announcement text, set when the banner appears so the polite live region
  // reads it without stealing focus.
  const [announcement, setAnnouncement] = useState("");
  const bannerRef = useRef<HTMLDivElement>(null);

  const descriptionId = useId();

  const show = useCallback(() => {
    setVisible(true);
    // Defer so the live region exists before its content changes (SR reads it).
    setAnnouncement(
      "Cookie consent. This site can use analytics cookies. Choose Accept or Decline."
    );
  }, []);

  // On mount, decide whether to show. If a prior "accepted" choice exists,
  // honor it by loading analytics; a "declined" choice stays declined.
  useEffect(() => {
    const stored = readStoredConsent();
    if (stored === "accepted") {
      loadAnalytics();
      return;
    }
    if (stored === "declined") {
      return;
    }
    // Reading the persisted consent (an external store) and surfacing the
    // banner is exactly the external-system sync an effect is for; the setState
    // runs once on mount when no prior choice exists, not in a render loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    show();
  }, [show]);

  // Allow reopening from the footer "Cookie preferences" control.
  useEffect(() => {
    function handleReopen() {
      show();
    }
    window.addEventListener(REOPEN_EVENT, handleReopen);
    return () => window.removeEventListener(REOPEN_EVENT, handleReopen);
  }, [show]);

  const accept = useCallback(() => {
    writeStoredConsent("accepted");
    loadAnalytics();
    setVisible(false);
    setAnnouncement("");
  }, []);

  const decline = useCallback(() => {
    writeStoredConsent("declined");
    setVisible(false);
    setAnnouncement("");
  }, []);

  // Escape declines (per the contract) without trapping focus.
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      decline();
    }
  }

  return (
    <>
      {/*
        Polite live region, always mounted so its text change is announced.
        Kept visually hidden; it mirrors the banner's purpose on appear.
      */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {visible && (
        <div
          ref={bannerRef}
          role="dialog"
          aria-label="Cookie consent"
          aria-describedby={descriptionId}
          onKeyDown={handleKeyDown}
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background text-foreground shadow-ia-deep"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <p id={descriptionId} className="text-sm text-foreground">
              This site can use analytics cookies to understand how it is used.
              Analytics load only if you accept. You can change your choice any
              time from the &ldquo;Cookie preferences&rdquo; link in the footer.
            </p>
            <div className="flex flex-shrink-0 flex-wrap gap-3">
              <button
                type="button"
                onClick={decline}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-border bg-secondary px-5 py-2.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={accept}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Accept cookies
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CookieConsent;
