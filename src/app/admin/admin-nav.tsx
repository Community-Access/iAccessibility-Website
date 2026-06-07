"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type AdminSection = { href: string; label: string };

export function AdminNav({
  sections,
  role,
  name
}: {
  sections: AdminSection[];
  role: string;
  name: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin sections"
      className="rounded-lg bg-white p-4 shadow-wordpress"
    >
      <p className="mb-3 text-sm text-[#595959]">
        Signed in as{" "}
        <span className="font-semibold text-[#222222]">{name}</span>
        <br />
        <span className="capitalize">{role}</span>
      </p>
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
