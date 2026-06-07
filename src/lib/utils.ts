import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with conflict resolution: clsx handles conditional /
 * array inputs, tailwind-merge dedupes conflicting Tailwind utilities so the
 * last one wins (e.g. cn("p-2", "p-4") -> "p-4").
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
