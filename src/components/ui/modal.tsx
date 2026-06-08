"use client";

import { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Ported from the Start-testing modal primitive (proven accessible), re-themed
// to the iAccessibility light palette. Native <dialog> + showModal() so the
// browser provides the top-layer, ::backdrop, and inert background. Adds body
// scroll lock (native <dialog> does not lock scroll) per accessibility-lead.

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  triggerRef?: React.RefObject<HTMLElement | null>;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  triggerRef,
  initialFocusRef
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const savedScrollPosition = useRef(0);
  const wasOpen = useRef(false);

  // Return focus to the trigger (or previously focused element) on close,
  // restoring scroll position. Guards against the trigger being removed.
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      savedScrollPosition.current = window.scrollY;
      wasOpen.current = true;
    } else if (wasOpen.current) {
      wasOpen.current = false;
      const target = triggerRef?.current || previousActiveElement.current;
      const scrollY = savedScrollPosition.current;
      window.scrollTo(0, scrollY);
      // Only refocus if the element is still in the document.
      if (target && document.contains(target)) {
        target.focus({ preventScroll: true });
        window.scrollTo(0, scrollY);
      }
    }
  }, [isOpen, triggerRef]);

  // Show/hide the dialog and set initial focus.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
      requestAnimationFrame(() => {
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus({ preventScroll: true });
        } else {
          closeButtonRef.current?.focus({ preventScroll: true });
        }
      });
    } else {
      dialog.close();
    }
  }, [isOpen, initialFocusRef]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Escape -> onClose via the dialog's native cancel event.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  // Belt-and-suspenders Tab focus trap (modern browsers already trap in the
  // top layer; this covers older engines). Queries currently-focusable nodes.
  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Close only when the click lands on the <dialog> backdrop itself, not a
  // child. Avoids synthetic SR click events (coords 0,0) closing the modal.
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
      className={cn(
        "fixed inset-0 z-50 m-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg p-0 shadow-wordpress backdrop:bg-black/50",
        "bg-card text-[#222222]",
        className
      )}
    >
      <div className="p-6" onClick={(e) => e.stopPropagation()}>
        <button
          ref={closeButtonRef}
          onClick={onClose}
          type="button"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md text-[#595959] transition-colors hover:bg-muted hover:text-[#222222] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <h2
          id="modal-title"
          className="pr-10 text-lg font-semibold text-[#222222]"
        >
          {title}
        </h2>

        {description && (
          <p id="modal-description" className="mt-2 text-sm text-[#595959]">
            {description}
          </p>
        )}

        <div className="mt-6">{children}</div>
      </div>
    </dialog>
  );
}

export function ModalActions({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex justify-end gap-3">{children}</div>;
}

interface ModalButtonProps {
  variant?: "primary" | "secondary" | "danger";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  children: React.ReactNode;
}

export function ModalButton({
  variant = "secondary",
  onClick,
  disabled,
  type = "button",
  children
}: ModalButtonProps) {
  const base =
    "rounded-md px-4 py-2 font-medium transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card";

  const variants = {
    primary: "bg-primary px-6 font-semibold text-primary-foreground hover:opacity-90",
    secondary:
      "border border-[#767676] text-[#222222] hover:bg-muted",
    danger: "bg-destructive text-destructive-foreground hover:opacity-90"
  } as const;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(base, variants[variant])}
    >
      {children}
    </button>
  );
}
