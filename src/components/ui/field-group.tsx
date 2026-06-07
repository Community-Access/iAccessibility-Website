import * as React from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * FieldGroup — fieldset/legend grouping helper for sets of related controls
 * (radio groups, checkbox groups, an address block, a date split into
 * day/month/year, etc.). A <fieldset> with a <legend> is the correct semantic
 * grouping (SC 1.3.1, 3.3.2): the legend names the whole group and is announced
 * with each contained control.
 *
 * Provides:
 *   - <legend> with an optional required marker (visible asterisk that is
 *     aria-hidden — requiredness is conveyed by text too, never color/asterisk
 *     alone).
 *   - group-level help text tied to the fieldset via aria-describedby.
 *   - group-level error text (text + icon, role="alert") tied via
 *     aria-describedby, with aria-invalid on the fieldset. Conveyed beyond
 *     color.
 *
 * Pass the controls (e.g. radios, checkboxes) as children. For single-choice
 * radio sets prefer <RadioGroupField> (radio.tsx) which builds on this.
 */
interface FieldGroupProps {
  legend: React.ReactNode;
  /** Renders a visible (aria-hidden) asterisk and text-level requiredness. */
  required?: boolean;
  description?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  /** Stable id base for help/error ids; auto-generated when omitted. */
  id?: string;
}

function FieldGroup({
  legend,
  required,
  description,
  error,
  className,
  children,
  id,
}: FieldGroupProps) {
  const reactId = React.useId();
  const base = id ?? reactId;
  const descId = description ? `${base}-description` : undefined;
  const errorId = error ? `${base}-error` : undefined;
  const describedBy = [descId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <fieldset
      className={cn("min-w-0 border-0 p-0", className)}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
    >
      <legend className="mb-1 text-sm font-medium text-foreground">
        {legend}
        {required ? (
          <>
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </legend>

      {description ? (
        <p id={descId} className="mb-2 text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}

      {children}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-2 flex items-center gap-1.5 text-sm font-medium text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </fieldset>
  );
}

export { FieldGroup };
