"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * FormErrorSummary — the shared error-summary pattern (WCAG SC 3.3.1).
 *
 * On submit-with-errors, render this at the TOP of the form. It:
 *   - is an <h2> ("There are N problems with this form") + an ordered list of
 *     links, one per invalid field, whose text is the field's label and whose
 *     href is #<field-id> so activating a link moves focus to that control
 *   - receives focus itself when it appears (its container is tabindex=-1) so a
 *     screen-reader/keyboard user lands on the summary, not back at the top
 *   - is announced assertively via role="alert" (interrupts to report failure)
 *
 * Field ids in `errors` MUST match the `id` you passed to <Field> so the links
 * resolve to real controls. Use the `useFormErrorSummary` hook below to wire
 * focus + ordering.
 */
export interface FieldError {
  /** The control id — must match the Field/control id so the link resolves. */
  id: string;
  /** Human label used as the link text (e.g. the field's visible label). */
  label: React.ReactNode;
  /** Optional message (not required; the link text is the field label). */
  message?: React.ReactNode;
}

interface FormErrorSummaryProps {
  errors: FieldError[];
  /** Ref to focus on appear; provided by useFormErrorSummary. */
  summaryRef?: React.Ref<HTMLDivElement>;
  /** Heading text override; a sensible default is derived from the count. */
  title?: React.ReactNode;
  className?: string;
}

function FormErrorSummary({
  errors,
  summaryRef,
  title,
  className,
}: FormErrorSummaryProps) {
  if (errors.length === 0) return null;

    const heading =
      title ??
      `There ${errors.length === 1 ? "is" : "are"} ${errors.length} problem${
        errors.length === 1 ? "" : "s"
      } with this form`;

    return (
      <div
        ref={summaryRef}
        tabIndex={-1}
        // role="group" (not alert): the container is self-focused on submit, so
        // a screen reader already reads it when focus lands. Pairing alert with
        // self-focus double-announces. The assertive announcer / interrupt is
        // responsible for the "failure" callout; this is just the focus target
        // and a labelled grouping for the list of problems.
        role="group"
        aria-labelledby="form-error-summary-heading"
        className={cn(
          "rounded-md border border-destructive bg-background p-4",
          // Land focus visibly without doubling the global ring.
          "focus:outline-none",
          className
        )}
      >
        <h2
          id="form-error-summary-heading"
          className="flex items-center gap-2 text-base font-semibold text-destructive"
        >
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{heading}</span>
        </h2>
        <ol className="mt-3 list-disc space-y-1 pl-6">
          {errors.map((error) => (
            <li key={error.id}>
              <a
                href={`#${error.id}`}
                className="text-destructive underline underline-offset-2"
                onClick={(event) => {
                  // Move focus to the control, not just scroll to it, so the
                  // user lands ON the field. Hash navigation alone does not
                  // focus non-tabbable targets reliably across browsers.
                  const target = document.getElementById(error.id);
                  if (target) {
                    event.preventDefault();
                    target.focus();
                    target.scrollIntoView({ block: "center" });
                  }
                }}
              >
                {error.label}
                {error.message ? `: ${error.message}` : null}
              </a>
            </li>
          ))}
        </ol>
      </div>
  );
}

/*
 * useFormErrorSummary — wiring helper.
 *
 * Returns a ref to attach to <FormErrorSummary summaryRef={ref}> and a
 * `focusSummary()` to call after a failed submit. focusSummary moves keyboard
 * focus to the summary container (which is tabindex=-1) so the assertive alert
 * is read and the user lands on the list of problems. Call it AFTER you set the
 * errors state (e.g. inside the submit handler), on the next frame so the
 * summary has rendered.
 *
 * Usage:
 *   const { summaryRef, focusSummary } = useFormErrorSummary();
 *   function onSubmit(e) {
 *     e.preventDefault();
 *     const errs = validate();
 *     setErrors(errs);
 *     if (errs.length) focusSummary();
 *   }
 *   return (
 *     <form onSubmit={onSubmit} noValidate>
 *       <FormErrorSummary errors={errors} summaryRef={summaryRef} />
 *       ...fields...
 *     </form>
 *   );
 */
function useFormErrorSummary() {
  const summaryRef = React.useRef<HTMLDivElement>(null);

  const focusSummary = React.useCallback(() => {
    // Defer to the next frame so the summary is mounted before we focus it.
    requestAnimationFrame(() => {
      summaryRef.current?.focus();
    });
  }, []);

  return { summaryRef, focusSummary };
}

export { FormErrorSummary, useFormErrorSummary };
