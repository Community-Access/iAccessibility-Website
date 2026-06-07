"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Label primitive (Radix). Radix Label forwards clicks to the associated
 * control and pairs with `htmlFor`. A visible <label> programmatically tied to
 * its input via htmlFor is the preferred labelling mechanism (SC 1.3.1, 4.1.2);
 * a placeholder is NOT a label. The Field wrapper wires htmlFor for you.
 *
 * `text-muted-foreground` resolves to --ia-text-2 (#575760, 7.0:1 on white /
 * #c4c4cc on dark), so label and help text always clear 4.5:1 in both themes.
 */
const labelVariants = cva(
  "text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
