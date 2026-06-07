"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider as RadixToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

/**
 * App-wide toast host (foundation contract: live regions for async). Wraps the
 * tree in Radix's ToastProvider and renders a single ToastViewport — an
 * aria-live region — so any `useToast().toast(...)` call is announced without
 * moving focus. The shell mounts exactly one of these.
 *
 * Variant carries a leading status word in the title so the meaning is never
 * color-only; callers can override the title.
 */

type ToastVariant = "default" | "success" | "error" | "warning";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms; Radix default if omitted. */
  duration?: number;
}

interface ActiveToast extends ToastOptions {
  id: number;
  open: boolean;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Default titles double as the status word so the variant is conveyed in text,
// not by color alone (SC 1.4.1).
const VARIANT_TITLE: Record<ToastVariant, string> = {
  default: "Notice",
  success: "Success",
  error: "Error",
  warning: "Warning",
};

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  const toast = useCallback((options: ToastOptions) => {
    const id = nextId++;
    setToasts((current) => [...current, { id, open: true, ...options }]);
  }, []);

  // On close, flip open=false (lets Radix run its exit), then drop the entry.
  const handleOpenChange = useCallback((id: number, open: boolean) => {
    if (open) return;
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <RadixToastProvider>
        {children}
        {toasts.map(({ id, title, description, variant = "default", duration }) => (
          <Toast
            key={id}
            variant={variant}
            duration={duration}
            onOpenChange={(open) => handleOpenChange(id, open)}
          >
            <div className="grid gap-1">
              <ToastTitle>{title ?? VARIANT_TITLE[variant]}</ToastTitle>
              {description ? (
                <ToastDescription>{description}</ToastDescription>
              ) : null}
            </div>
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </RadixToastProvider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    // No-op outside a provider so callers never have to null-check.
    return { toast: () => {} };
  }
  return context;
}
