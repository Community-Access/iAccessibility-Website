import * as React from "react";

import { cn } from "@/lib/utils";
import { FieldGroup } from "@/components/ui/field-group";

/*
 * Radio primitives — real native <input type="radio">. Native radios give
 * correct grouping/announcement and roving-tabindex arrow-key behaviour for
 * free when they share a `name`. We only style them.
 *
 * A set of radios is a single-choice group and MUST be wrapped in a
 * <fieldset> with a <legend> (the group's question). Use <RadioGroupField>
 * below, which renders the fieldset/legend, help text, error text, and the
 * individual options for you. The legend is the programmatic group label —
 * do not rely on a nearby heading alone (SC 1.3.1, 3.3.2).
 */
const Radio = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type">
>(({ className, ...props }, ref) => {
  return (
    <input
      type="radio"
      ref={ref}
      className={cn(
        "h-4 w-4 shrink-0 border border-input bg-background",
        "accent-[hsl(var(--primary))]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});
Radio.displayName = "Radio";

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}

interface RadioGroupFieldProps {
  /** Shared name for the radio set; also seeds option ids. */
  name: string;
  /** The group's question — rendered as the <legend>. */
  legend: React.ReactNode;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  /** Help text for the whole group, tied via aria-describedby on the fieldset. */
  description?: React.ReactNode;
  /** Error text for the whole group; sets aria-invalid on the fieldset. */
  error?: React.ReactNode;
  className?: string;
}

/*
 * RadioGroupField — a complete single-choice question. Renders a
 * <fieldset><legend> group (via FieldGroup) with required marker, help text,
 * and an assertive error message (text + icon, not color alone). Each option
 * is a native radio with a clickable label; the row padding keeps the hit
 * target over 24x24 px.
 */
function RadioGroupField({
  name,
  legend,
  options,
  value,
  defaultValue,
  onChange,
  required,
  description,
  error,
  className,
}: RadioGroupFieldProps) {
  return (
    <FieldGroup
      legend={legend}
      required={required}
      description={description}
      error={error}
      className={className}
    >
      <div className="space-y-2">
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          const descId = option.description ? `${id}-description` : undefined;
          return (
            <div key={option.value} className="flex items-start gap-2 py-0.5">
              <Radio
                id={id}
                name={name}
                value={option.value}
                checked={value !== undefined ? value === option.value : undefined}
                defaultChecked={
                  defaultValue !== undefined ? defaultValue === option.value : undefined
                }
                onChange={(e) => onChange?.(e.target.value)}
                disabled={option.disabled}
                aria-describedby={descId}
                className="mt-0.5"
              />
              <div className="min-w-0">
                <label htmlFor={id} className="text-sm leading-tight text-foreground">
                  {option.label}
                </label>
                {option.description ? (
                  <p id={descId} className="mt-1 text-sm text-muted-foreground">
                    {option.description}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </FieldGroup>
  );
}

export { Radio, RadioGroupField };
