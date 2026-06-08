import type { ReactNode } from "react";
import { type LucideIcon, Package } from "lucide-react";

// Ported from the Start-testing empty-state primitive (proven accessible),
// re-themed to the iAccessibility light palette. The icon is decorative
// (aria-hidden); the heading carries meaning. Heading level is configurable
// so the empty state fits the surrounding document outline (WCAG 1.3.1/2.4.6).

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Heading level so the empty state fits the page outline. Default 3. */
  headingLevel?: 2 | 3 | 4;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Package,
  title,
  description,
  headingLevel = 3,
  action,
  className = ""
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-[#767676] bg-card px-4 py-12 text-center ${className}`}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-8 w-8 text-[#595959]" aria-hidden="true" />
      </div>
      <Heading className="mb-2 text-lg font-semibold text-[#222222]">
        {title}
      </Heading>
      {description && (
        <p className="mb-6 max-w-sm text-sm text-[#595959]">{description}</p>
      )}
      {action}
    </div>
  );
}

/** Simpler inline empty state for smaller areas like lists. */
export function EmptyStateInline({
  message,
  className = ""
}: {
  message: string;
  className?: string;
}) {
  return (
    <p className={`py-8 text-center text-[#595959] ${className}`}>{message}</p>
  );
}
