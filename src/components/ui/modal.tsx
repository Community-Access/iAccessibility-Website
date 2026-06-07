"use client";

import {
  useId,
  useRef,
  useEffect,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /**
   * "dialog" for ordinary modals; "alertdialog" for destructive or
   * consent-style decisions that demand an explicit choice. alertdialog
   * variants also disable backdrop dismissal and take initial focus on the
   * safe (Cancel) action.
   */
  role?: "dialog" | "alertdialog";
  /**
   * Optional element to return focus to on close. When omitted we restore
   * focus to whatever was focused at open time (captured below), so the close
   * path is correct even for callers that do not thread a ref through.
   */
  triggerRef?: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
}

function Modal({
  isOpen,
  onClose,
  title,
  description,
  role = "dialog",
  triggerRef,
  initialFocusRef,
  children,
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollPositionRef = useRef(0);
  // Element focused at the moment the dialog opened. We restore focus here on
  // close whenever no explicit triggerRef is supplied (REQUIRED FIX over BTG).
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // alertdialog disables backdrop dismissal so a destructive/consent decision
  // can't be made (or escaped into) by an accidental backdrop click.
  const dismissOnBackdrop = role === "dialog";

  // Show the dialog when isOpen becomes true; capture the prior focus owner.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      scrollPositionRef.current = window.scrollY;
      previouslyFocusedRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      if (!dialog.open) {
        dialog.showModal();
      }

      // Set initial focus. For alertdialog, prefer the safe action so an
      // accidental Enter does not trigger a destructive default.
      const focusTimeout = setTimeout(() => {
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus();
          return;
        }
        if (role === "alertdialog") {
          const safeAction =
            dialog.querySelector<HTMLElement>("[data-modal-safe-action]");
          if (safeAction) {
            safeAction.focus();
            return;
          }
        }
        const firstFocusable = dialog.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, 10);

      return () => clearTimeout(focusTimeout);
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen, initialFocusRef, role]);

  // Restore focus when closing: explicit triggerRef wins; otherwise fall back
  // to whatever was focused at open time so focus never lands on <body>.
  useEffect(() => {
    if (isOpen) return;
    const target = triggerRef?.current ?? previouslyFocusedRef.current;
    if (!target) return;

    const restore = setTimeout(() => {
      target.focus();
      window.scrollTo(0, scrollPositionRef.current);
    }, 50);
    return () => clearTimeout(restore);
  }, [isOpen, triggerRef]);

  // Handle the native cancel event (Escape). showModal() gives us the focus
  // trap for free, so we never hand-roll one.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;

    function handleCancel(e: Event) {
      e.preventDefault();
      dialog?.close();
      onClose();
    }

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [isOpen, onClose]);

  // Track where the mousedown started to avoid closing on file-picker return.
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  function handleMouseDown(e: React.MouseEvent) {
    mouseDownTargetRef.current = e.target;
  }

  // Backdrop click — only close if both mousedown and mouseup landed on the
  // backdrop itself, and only for variants that allow backdrop dismissal.
  function handleBackdropClick(e: React.MouseEvent) {
    if (!dismissOnBackdrop) return;
    if (
      e.target === dialogRef.current &&
      mouseDownTargetRef.current === dialogRef.current
    ) {
      dialogRef.current?.close();
      onClose();
    }
    mouseDownTargetRef.current = null;
  }

  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <dialog
      ref={dialogRef}
      role={role}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onMouseDown={handleMouseDown}
      onClick={handleBackdropClick}
      className="fixed inset-0 m-auto max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-background p-0 text-foreground shadow-ia-deep backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn("p-6", className)}
        >
          <h2 id={titleId} className="text-xl font-semibold tracking-tight">
            {title}
          </h2>
          {description && (
            <p
              id={descriptionId}
              className="mt-1.5 text-sm text-muted-foreground"
            >
              {description}
            </p>
          )}
          <div className="mt-6">{children}</div>
        </div>
      )}
    </dialog>
  );
}

function ModalActions({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-3 pt-6">{children}</div>;
}

interface ModalButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline";
  /**
   * Mark the safe choice (e.g. Cancel) in an alertdialog so initial focus
   * lands here instead of the destructive default.
   */
  safeAction?: boolean;
}

function ModalButton({
  variant = "default",
  type = "button",
  safeAction = false,
  className,
  children,
  ...rest
}: ModalButtonProps) {
  const baseClasses =
    "inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  const variantClasses = {
    // Deep blue / white (7.09:1).
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    // Darkened red #b42318 / white (6.57:1); always paired with a text label.
    destructive:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    // Bordered neutral for secondary / Cancel actions.
    outline:
      "border border-border bg-secondary text-secondary-foreground hover:bg-muted",
  };

  return (
    <button
      type={type}
      data-modal-safe-action={safeAction ? "" : undefined}
      className={cn(baseClasses, variantClasses[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export { Modal, ModalActions, ModalButton };
