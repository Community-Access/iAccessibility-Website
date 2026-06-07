"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const COOKIE_KEY = "iaccessibility_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const acceptButtonRef = useRef<HTMLButtonElement>(null);
  const preferencesButtonRef = useRef<HTMLButtonElement>(null);
  const shouldReturnFocusRef = useRef(false);

  useEffect(() => {
    if (visible && shouldReturnFocusRef.current) {
      acceptButtonRef.current?.focus();
    }
  }, [visible]);

  useEffect(() => {
    const saved = window.localStorage.getItem(COOKIE_KEY);
    if (!saved) {
      setVisible(true);
      setAnnouncement("Cookie consent banner shown.");
    }
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && visible) {
        decline();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [visible]);

  function accept() {
    window.localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
    if (shouldReturnFocusRef.current) preferencesButtonRef.current?.focus();
    shouldReturnFocusRef.current = false;
  }

  function decline() {
    window.localStorage.setItem(COOKIE_KEY, "declined");
    setVisible(false);
    if (shouldReturnFocusRef.current) preferencesButtonRef.current?.focus();
    shouldReturnFocusRef.current = false;
  }

  function reopen() {
    window.localStorage.removeItem(COOKIE_KEY);
    shouldReturnFocusRef.current = true;
    setVisible(true);
    setAnnouncement("Cookie preferences reopened.");
  }

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
      {visible ? (
        <section
          aria-labelledby="cookie-consent-heading"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background p-4 shadow-lg"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="cookie-consent-heading" className="sr-only">
              Cookie consent
            </h2>
            <p className="text-sm text-foreground">
              iAccessibility uses essential cookies now. Analytics will only
              load after you accept.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button ref={acceptButtonRef} type="button" size="sm" onClick={accept}>
                Accept
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={decline}>
                Decline
              </Button>
            </div>
          </div>
        </section>
      ) : null}
      <button
        ref={preferencesButtonRef}
        type="button"
        onClick={reopen}
        className="text-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Cookie preferences
      </button>
    </>
  );
}
