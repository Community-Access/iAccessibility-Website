"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

/*
 * Client half of the Header's logged-in user menu (foundation contract
 * section 2). The Header itself is a server component: it resolves the current
 * user and the RBAC capability flags server-side and passes them down as plain
 * props. This component owns ONLY the interactive disclosure — it never decides
 * authorization. Items the viewer can't access are simply absent from `props`
 * (the server removed them from the tree), so there is nothing to visually
 * hide here.
 *
 * Accessibility contract (verbatim from section 2):
 *   - trigger <button aria-haspopup="menu" aria-expanded aria-label="User menu
 *     for {name}">
 *   - menu role="menu" aria-label; items role="menuitem" tabindex=-1
 *   - open -> focus first item; Arrow/Home/End move roving focus
 *   - Escape closes + returns focus to the trigger
 *   - Tab / outside-click close
 *
 * Menu items are real <a href> (Link) and <button> elements, so they stay
 * keyboard-operable and screen-reader-correct; role="menuitem" + tabindex=-1
 * layer the menu semantics on top without replacing the native element.
 */

export type UserMenuLink = {
  href: string;
  label: string;
};

export type UserMenuProps = {
  /** Display name (or email fallback) used in the trigger label and header. */
  displayName: string;
  /** Email, shown under the name in the menu header. May be null. */
  email: string | null;
  /** Avatar image URL; falls back to the name initial when absent. */
  avatarUrl: string | null;
  /**
   * Authorized menu links, already RBAC-filtered server-side. Order is
   * preserved. Anything the viewer can't access is simply not in this array.
   */
  links: UserMenuLink[];
};

export function UserMenu({ displayName, email, avatarUrl, links }: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const initial = displayName.charAt(0).toUpperCase() || "?";

  // On open, move focus to the first menu item (contract: "open -> focus first
  // item"). Reading the live DOM keeps this correct regardless of which items
  // the server included.
  useEffect(() => {
    if (open && menuRef.current) {
      const first = menuRef.current.querySelector<HTMLElement>('[role="menuitem"]');
      first?.focus();
    }
  }, [open]);

  // Outside-click closes the menu. Escape is handled on the menu container
  // itself so it can also return focus to the trigger.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const closeAndRefocus = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Roving focus + Escape/Tab handling within the open menu.
  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!menuRef.current) return;
      const items = Array.from(
        menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]'),
      );
      if (items.length === 0) return;
      const idx = items.indexOf(document.activeElement as HTMLElement);

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          items[(idx + 1) % items.length]?.focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          items[(idx - 1 + items.length) % items.length]?.focus();
          break;
        case "Home":
          e.preventDefault();
          items[0]?.focus();
          break;
        case "End":
          e.preventDefault();
          items[items.length - 1]?.focus();
          break;
        case "Escape":
          e.preventDefault();
          closeAndRefocus();
          break;
        case "Tab":
          // Tabbing out of the menu closes it but does NOT steal focus —
          // let the browser move focus naturally to the next element.
          setOpen(false);
          break;
      }
    },
    [closeAndRefocus],
  );

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setOpen(false);
    try {
      await authClient.signOut();
    } finally {
      // Re-render server components so the menu collapses to "Sign in", then
      // land on the home page.
      router.refresh();
      router.push("/");
    }
  }

  // Shared classes for the interactive menu rows.
  const itemClass =
    "flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary focus-visible:bg-secondary";

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`User menu for ${displayName}`}
        className="nav-focus-ring flex min-h-[44px] items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-white transition-colors hover:bg-ia-blue-deep"
      >
        <span
          className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-ia-blue-deep text-xs font-semibold text-white"
          aria-hidden="true"
        >
          {avatarUrl ? (
            // Provider avatar URLs are not in next/image remotePatterns, and a
            // plain decorative <img> keeps this safe regardless of host.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-7 w-7 object-cover" />
          ) : (
            initial
          )}
        </span>
        <span className="hidden sm:inline">{displayName}</span>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`User menu for ${displayName}`}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-md border border-border bg-background py-1 text-foreground shadow-lg"
        >
          {/* Identity header — not a menuitem, purely informational. */}
          <div className="border-b border-border px-3 py-2">
            <p className="text-sm font-medium leading-tight">{displayName}</p>
            {email && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{email}</p>
            )}
          </div>

          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              {link.label}
            </Link>
          ))}

          <div className="mt-1 border-t border-border pt-1">
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={handleSignOut}
              disabled={signingOut}
              className={cn(itemClass, "text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10 disabled:opacity-60")}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
