import * as React from "react";

import { cn } from "@/lib/utils";

/*
 * Input primitive. Ported from Beyond-The-Gallery-Web and re-colored to the
 * iAccessibility token system:
 *   - `border-input` is --ia-text-2 (#575760 / dark #8a8a94), so the control
 *     boundary clears 3:1 against the surface in BOTH themes (SC 1.4.11). We do
 *     NOT use a transparent border that only appears on focus.
 *   - Focus is handled by the global :focus-visible outline (deep-blue ring,
 *     offset 2) in globals.css; we never set outline:none without a replacement.
 *   - aria-invalid styling adds a destructive border + ring so the error state
 *     is conveyed by more than color (it pairs with the text+icon error message
 *     wired by <Field>). The control still relies on aria-describedby for the
 *     actual message.
 *
 * This component has NO built-in label by design — labelling is the composer's
 * job. Use <Field> (field.tsx) to wire <label htmlFor>, required, help and error
 * text. A placeholder is never a substitute for a label.
 *
 * autocomplete guidance (SC 1.3.5): pass the right token so browsers/AT can
 * autofill — e.g. autoComplete="email", "name", "tel", "current-password",
 * "new-password", "one-time-code", "street-address", "postal-code". For login
 * password fields use "current-password"; for sign-up/reset use "new-password".
 *
 * Password fields MUST allow paste (SC 3.3.8 / password-manager support): do not
 * add onPaste/onCopy/onDrop handlers that block it. Native paste is allowed and
 * this component never blocks it.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Error state: destructive border conveys invalidity beyond color via
          // the paired text+icon message; ring kept for focus parity.
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-destructive",
          "md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
