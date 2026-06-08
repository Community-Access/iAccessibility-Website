import {
  cloneElement,
  isValidElement,
  type ReactNode
} from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldControlProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

type FormFieldProps = {
  id: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export function FormField({
  id,
  label,
  description,
  error,
  required,
  className,
  children
}: FormFieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ");
  const fieldControl = isValidElement<FieldControlProps>(children)
    ? cloneElement(children, {
        "aria-describedby": [
          children.props["aria-describedby"],
          describedBy
        ]
          .filter(Boolean)
          .join(" ") || undefined,
        "aria-invalid": error ? true : children.props["aria-invalid"]
      })
    : children;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      {description ? (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {fieldControl}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
