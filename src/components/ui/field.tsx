"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/*
 * Field — the standard wrapper that makes any single control accessible.
 *
 * It wires, for the control you pass as `children`:
 *   - a visible <label htmlFor={id}> (a placeholder is NEVER the label, SC 3.3.2)
 *   - required: the native `required` attribute on the control PLUS a visible
 *     asterisk that is aria-hidden, with " (required)" exposed to AT via text —
 *     requiredness is never conveyed by the asterisk/color alone
 *   - help text tied to the control via aria-describedby
 *   - error text (text + AlertCircle icon, role="alert") tied via
 *     aria-describedby, with aria-invalid="true" set on the control — the error
 *     state is conveyed by text and icon, not color alone (SC 1.4.1, 3.3.1)
 *
 * The control receives `id`, `aria-describedby`, `aria-invalid`, and `required`
 * by cloning, so it works with <Input>, <Textarea>, the Radix <SelectTrigger>,
 * or any control that forwards these props. The `id` is required so the label's
 * htmlFor and the field's describedby ids resolve.
 *
 * For radio/checkbox GROUPS use <FieldGroup> (fieldset/legend) instead; for a
 * single inline checkbox use <CheckboxField>.
 *
 * Example:
 *   <Field id="email" label="Email" required help="We never share it."
 *          error={errors.email}>
 *     <Input type="email" autoComplete="email" />
 *   </Field>
 */
interface FieldProps {
  /** Stable, unique id; becomes the control id and seeds describedby ids. */
  id: string;
  label: React.ReactNode;
  /** Sets native `required` on the control + visible/text required markers. */
  required?: boolean;
  /** Help/hint text rendered under the label, before the control. */
  help?: React.ReactNode;
  /** Error message; when set, marks the control aria-invalid and announces it. */
  error?: React.ReactNode;
  className?: string;
  /** A single form control (Input, Textarea, SelectTrigger, ...). */
  children: React.ReactElement;
}

function Field({ id, label, required, help, error, className, children }: FieldProps) {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  // Preserve any describedby the control already had, then append ours.
  const childProps = children.props as {
    "aria-describedby"?: string;
  };
  const describedBy =
    [childProps["aria-describedby"], helpId, errorId].filter(Boolean).join(" ") ||
    undefined;

  const control = React.cloneElement(children, {
    id,
    required,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
  } as React.HTMLAttributes<HTMLElement> & { required?: boolean });

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <>
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </Label>

      {help ? (
        <p id={helpId} className="text-sm text-muted-foreground">
          {help}
        </p>
      ) : null}

      {control}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-sm font-medium text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export { Field };
export type { FieldProps };
