import * as React from "react";

import { cn } from "@/lib/utils";

/*
 * Textarea primitive. Ported from Beyond-The-Gallery-Web and re-colored to the
 * iAccessibility tokens (same rules as input.tsx): visible `border-input`
 * boundary (3:1 UI in both themes), global :focus-visible outline, and an
 * aria-invalid destructive border that pairs with the text+icon error message
 * from <Field>. No built-in label — compose with <Field>.
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground transition-colors",
        "placeholder:text-muted-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-destructive",
        "md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
