import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Ported from the Start-testing badge primitives (proven accessible) and
// re-themed to the iAccessibility light palette. Contrast targets per the
// accessibility-lead review: every variant is a solid/tinted pill with text
// that clears 4.5:1 for small text. Color is NEVER the only signal — a text
// label is always required (WCAG 1.4.1).

export type BadgeVariant =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "error";

const variantClasses: Record<BadgeVariant, string> = {
  // bg-muted (#ededed) + foreground (#212121) ~ 12:1
  neutral: "bg-muted text-[#212121] border border-[#767676]",
  // #0364a8 (the --ring blue) + white ~ 5:1
  info: "bg-[#0364a8] text-white border border-transparent",
  // #e7f5ec tint + #1a6b38 text ~ 5.4:1
  success: "bg-[#e7f5ec] text-[#1a6b38] border border-[#1a6b38]/40",
  // #fdf3e0 tint + #7a4d04 text ~ 6:1
  warning: "bg-[#fdf3e0] text-[#7a4d04] border border-[#7a4d04]/40",
  // #fdeaea tint + #8a1414 text ~ 6.3:1
  error: "bg-[#fdeaea] text-[#8a1414] border border-[#8a1414]/40"
};

const sizeClasses = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-sm"
} as const;

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: keyof typeof sizeClasses;
  /** Optional decorative icon (rendered aria-hidden). */
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Badge({
  variant = "neutral",
  size = "sm",
  icon,
  className,
  children
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {icon && (
        <span aria-hidden="true" className="inline-flex">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

export interface StatusBadgeConfig {
  /** Always required — the visible text carries the meaning, not the color. */
  label: string;
  variant?: BadgeVariant;
  icon?: ReactNode;
}

/**
 * Config-driven status pill. Generic replacement for the product-coupled
 * Start-testing StatusBadge (which mapped bug/feature states).
 */
export function StatusBadge({
  config,
  size = "sm",
  className
}: {
  config: StatusBadgeConfig;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  return (
    <Badge
      variant={config.variant ?? "neutral"}
      size={size}
      icon={config.icon}
      className={className}
    >
      {config.label}
    </Badge>
  );
}
