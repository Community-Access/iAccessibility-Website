import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission, canModerate } from "@/lib/auth/roles";

import { NavLink } from "./nav-link";
import { UserMenu, type UserMenuLink } from "./user-menu";

/*
 * Site header (foundation contract section 2). SERVER component: it resolves
 * the signed-in user and their RBAC capabilities server-side, then renders the
 * <nav> plus a Sign-in link or the interactive <UserMenu>. The interactive
 * leaves (NavLink for aria-current, UserMenu for the disclosure) are the only
 * client pieces.
 *
 * RBAC gating REMOVES unauthorized items from the DOM rather than visually
 * hiding them: the menu link list is built here from capability checks, so an
 * unauthorized viewer never receives the markup at all. This is presentation
 * only — every gated route/action is independently enforced server-side
 * (requireCapability in session.ts). The matrix in lib/auth/roles.ts is the
 * single source of truth; we ask hasPermission(role, capability), never the
 * role name.
 *
 * Colors are the iAccessibility nav palette: accent blue #1e73be background
 * (bg-ia-blue-accent), deep blue #035a9e hover (hover:bg-ia-blue-deep), white
 * text — all AA-compliant. The dropdown surface itself sits on the theme
 * background tokens (bg-background / text-foreground), not the blue bar.
 *
 * Layout (src/app/layout.tsx) owns the <header> landmark and the skip-link
 * target; this component renders the <nav aria-label="Main"> inside it. App
 * shell imports <Header /> — it does not pass props.
 */

// Primary navigation, shown to everyone. Public content areas per the platform
// spec (directory, blog, podcasts, guidelines).
const PRIMARY_NAV: { href: string; label: string }[] = [
  { href: "/directory", label: "App Directory" },
  { href: "/blog", label: "Blog" },
  { href: "/podcasts", label: "Podcasts" },
  { href: "/guidelines", label: "Guidelines" },
];

export async function Header() {
  const current = await getCurrentUser();
  const role = current?.role ?? null;

  // Build the RBAC-filtered user-menu links. Every authenticated member gets
  // Profile + submit; moderators/admins add the review queue; admins add the
  // admin panel. Unauthorized items are simply never pushed onto the array.
  const menuLinks: UserMenuLink[] = [];
  if (current) {
    menuLinks.push({ href: "/profile", label: "My profile" });
    if (hasPermission(role, "submit:directory")) {
      menuLinks.push({ href: "/directory/submit", label: "Submit an app" });
    }
    if (canModerate(role)) {
      menuLinks.push({ href: "/review", label: "Review queue" });
    }
    if (hasPermission(role, "access:admin-panel")) {
      menuLinks.push({ href: "/admin", label: "Admin panel" });
    }
  }

  return (
    <nav
      aria-label="Main"
      className="w-full bg-ia-blue-accent text-white"
    >
      <div className="mx-auto flex min-h-[56px] w-full max-w-6xl items-center justify-between gap-4 px-4">
        {/* Logo link, named by its text. The mark is decorative (alt="" +
            aria-hidden) so the accessible name comes from the visible/sr-only
            wordmark, never a redundant image alt. */}
        <Link
          href="/"
          className="nav-focus-ring flex min-h-[44px] items-center gap-2 rounded-md px-2 font-semibold tracking-tight text-white transition-colors hover:bg-ia-blue-deep"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" aria-hidden="true" width={28} height={28} className="rounded" />
          <span>iAccessibility</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <ul className="flex items-center gap-1 sm:gap-2">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href}>{item.label}</NavLink>
              </li>
            ))}
          </ul>

          {current ? (
            <UserMenu
              displayName={current.record.displayName ?? current.record.email}
              email={current.record.email}
              avatarUrl={current.record.avatarUrl}
              links={menuLinks}
            />
          ) : (
            <Link
              href="/auth/sign-in"
              className="nav-focus-ring flex min-h-[44px] items-center rounded-md px-3 text-sm font-semibold text-white underline underline-offset-4 transition-colors hover:bg-ia-blue-deep"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
