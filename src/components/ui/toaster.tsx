"use client";

import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport
} from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

// Maps each variant to its Radix announcement type + auto-dismiss timing, per
// accessibility-lead: error = foreground (assertive) + persistent (never
// auto-dismiss something the user must act on); everything else = background
// (polite) + 5s. Radix's timer pauses on hover/focus (WCAG 2.2.1). A leading
// icon gives a non-color signal (WCAG 1.4.1); the message text is what's
// announced (icons are aria-hidden).

const variantIcon = {
  default: null,
  success: CircleCheck,
  error: CircleAlert,
  warning: TriangleAlert
} as const;

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map(({ id, title, description, variant = "default", open }) => {
        const Icon = variantIcon[variant];
        const isError = variant === "error";
        return (
          <Toast
            key={id}
            variant={variant}
            open={open}
            type={isError ? "foreground" : "background"}
            duration={isError ? Infinity : 5000}
            onOpenChange={(next) => {
              if (!next) dismiss(id);
            }}
          >
            <div className="flex items-start gap-3">
              {Icon && (
                <Icon
                  className="mt-0.5 h-5 w-5 shrink-0"
                  aria-hidden="true"
                />
              )}
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
