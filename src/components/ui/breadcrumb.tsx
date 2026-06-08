"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

// Ported from the Start-testing breadcrumb primitive (proven accessible),
// re-themed to the iAccessibility light palette and re-mapped to this site's
// routes. Semantics per accessibility-lead: nav[aria-label="Breadcrumb"] > ol,
// separators aria-hidden, the current page is plain text with aria-current.

// Map of route segments to human labels for this site.
const routeLabels: Record<string, string> = {
  about: "About",
  account: "Account",
  admin: "Admin",
  "app-directory": "App Directory",
  blog: "Blog",
  "iacast-network": "IACast Network",
  events: "Events",
  "my-calendar": "Events",
  plus: "Resources",
  posts: "Posts",
  privacy: "Privacy Policy",
  report: "Report an Issue",
  review: "Review Queue",
  submit: "Submit",
  users: "Users",
  new: "New"
};

interface Crumb {
  label: string;
  href: string;
  isCurrentPage: boolean;
}

function titleCase(segment: string) {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function Breadcrumb() {
  const pathname = usePathname();

  if (pathname === "/" || !pathname) return null;

  const segments = pathname.split("/").filter(Boolean);

  const crumbs: Crumb[] = [{ label: "Home", href: "/", isCurrentPage: false }];

  let currentPath = "";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;

    const isDynamic =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        segment
      ) || /^\d+$/.test(segment);

    const label = isDynamic
      ? "Details"
      : routeLabels[segment] || titleCase(segment);

    crumbs.push({ label, href: currentPath, isCurrentPage: isLast });
  });

  // Nothing useful beyond Home.
  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center">
            {index > 0 && (
              <ChevronRight
                className="mx-1 h-4 w-4 text-[#595959]"
                aria-hidden="true"
              />
            )}
            {crumb.isCurrentPage ? (
              <span className="font-medium text-[#222222]" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-[#0f6cba] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
