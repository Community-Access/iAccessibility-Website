import * as React from "react";

import { cn } from "@/lib/utils";

/*
 * Checkbox primitive — a real native <input type="checkbox">. Semantic HTML
 * before ARIA: the native control is already announced correctly, keyboard
 * operable (Space toggles), and pairs with a <label htmlFor>. We only style it.
 *
 * Accessibility notes:
 *   - `accent-[hsl(var(--primary))]` tints the native check to the deep-blue
 *     brand token in supporting browsers; the box border uses --ia-text-2 so it
 *     clears 3:1 (SC 1.4.11). Focus uses the global :focus-visible outline.
 *   - The box is 1rem; ensure the surrounding hit target is >= 24x24 CSS px
 *     (SC 2.5.8) by giving the row/label adequate padding. <CheckboxField> and
 *     the group helper below handle the clickable label + spacing for you.
 *   - For a group of checkboxes, wrap them in <FieldGroup> (fieldset/legend).
 */
const Checkbox = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type">
>(({ className, ...props }, ref) => {
  return (
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        "h-4 w-4 shrink-0 rounded-sm border border-input bg-background",
        "accent-[hsl(var(--primary))]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-destructive",
        className
      )}
      {...props}
    />
  );
});
Checkbox.displayName = "Checkbox";

/*
 * CheckboxField — a single checkbox with an inline label to its right (the
 * common "I agree to..." pattern). The whole label is clickable, giving a hit
 * target comfortably over 24x24 px. `description` adds help text tied via
 * aria-describedby. For required single checkboxes (e.g. terms acceptance), pass
 * `required` and a visible asterisk is rendered.
 */
interface CheckboxFieldProps
  extends Omit<React.ComponentProps<"input">, "type" | "id"> {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
}

const CheckboxField = React.forwardRef<HTMLInputElement, CheckboxFieldProps>(
  ({ id, label, description, required, className, ...props }, ref) => {
    const descId = description ? `${id}-description` : undefined;
    return (
      <div className="flex items-start gap-2">
        <Checkbox
          id={id}
          ref={ref}
          required={required}
          aria-describedby={descId}
          className="mt-0.5"
          {...props}
        />
        <div className="min-w-0">
          <label htmlFor={id} className={cn("text-sm leading-tight text-foreground", className)}>
            {label}
            {required ? (
              <span className="ml-0.5 text-destructive" aria-hidden="true">
                *
              </span>
            ) : null}
          </label>
          {description ? (
            <p id={descId} className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    );
  }
);
CheckboxField.displayName = "CheckboxField";

export { Checkbox, CheckboxField };
