"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/*
 * Primary-nav link with active-state marking (foundation contract section 2:
 * "active item aria-current='page' (not color alone)"). The active item is
 * marked with BOTH aria-current="page" (for assistive tech) and a visible
 * underline + heavier weight (so sighted users don't rely on color). A link is
 * active when the path equals its href or is nested beneath it (e.g. /blog/x
 * keeps "Blog" current), except the home href "/" which matches exactly.
 *
 * Kept as a thin client component so the surrounding Header can stay a server
 * component (it resolves RBAC server-side). Only the pathname read needs the
 * client.
 */

export type NavLinkProps = {
  href: string;
  children: React.ReactNode;
};

export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive =
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "nav-focus-ring flex min-h-[44px] items-center rounded-md px-3 text-sm font-medium text-white underline-offset-4 transition-colors hover:bg-ia-blue-deep hover:underline",
        isActive && "font-semibold underline",
      )}
    >
      {children}
    </Link>
  );
}
