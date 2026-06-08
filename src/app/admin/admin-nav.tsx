"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type AdminSection = { href: string; label: string };

export function AdminNav({ sections }: { sections: AdminSection[] }) {
  const pathname = usePathname();

  return (
    <nav className="rounded-lg bg-white p-4 shadow-wordpress">
      <ul className="space-y-1">
        {sections.map((section) => {
          const active =
            section.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(section.href);
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium text-[#222222] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]",
                  active && "bg-[#0066bf] text-white hover:bg-[#035a9e]"
                )}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
