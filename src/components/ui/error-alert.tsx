"use client";

import { useRef, useEffect } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";

// Ported from the Start-testing error-alert primitives (proven accessible),
// re-themed to the iAccessibility light palette. Per the accessibility-lead
// review the dark translucent fills (red-500/20 + red-200) were replaced with
// solid light tints + dark saturated text that clear 4.5:1. Color is never the
// only signal: each alert has a word ("Error"/"Success") and an icon.

interface ErrorAlertProps {
  message: string | null;
  title?: string;
  onDismiss?: () => void;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Accessible error alert.
 * - role="alert" + aria-live="assertive" announce immediately.
 * - Focusable (tabIndex=-1) and auto-focused so keyboard/SR users land on it.
 */
export function ErrorAlert({
  message,
  title = "Error",
  onDismiss,
  className = "",
  autoFocus = true
}: ErrorAlertProps) {
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && autoFocus && alertRef.current) {
      alertRef.current.focus();
    }
  }, [message, autoFocus]);

  if (!message) return null;

  return (
    <div
      ref={alertRef}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      tabIndex={-1}
      className={`flex items-start gap-3 rounded-lg border border-[#8a1414]/40 bg-[#fdeaea] p-4 text-[#8a1414] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
    >
      <CircleAlert
        className="mt-0.5 h-5 w-5 flex-shrink-0"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm">{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[#8a1414] transition-colors hover:bg-[#8a1414]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Dismiss error"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/**
 * Inline field error. Tie to its input with aria-describedby.
 * role="alert" so it's announced when validation fails.
 */
export function FieldError({
  id,
  message
}: {
  id: string;
  message: string | null;
}) {
  if (!message) return null;

  return (
    <p id={id} role="alert" className="mt-1 text-sm font-medium text-[#8a1414]">
      {message}
    </p>
  );
}

/** Success message. role="status" + aria-live="polite" (non-interrupting). */
export function SuccessAlert({
  message,
  className = ""
}: {
  message: string | null;
  className?: string;
}) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`flex items-start gap-3 rounded-lg border border-[#1a6b38]/40 bg-[#e7f5ec] p-4 text-[#1a6b38] ${className}`}
    >
      <CircleCheck
        className="mt-0.5 h-5 w-5 flex-shrink-0"
        aria-hidden="true"
      />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
