"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AuthMenu, MobileAuthActions } from "@/components/layout/auth-menu";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS } from "@/lib/content/wordpress";
import { cn } from "@/lib/utils";

const LOGO_URL =
  "https://iaccessibility.net/wp-content/uploads/2023/10/cropped-iA-Blue-128-Rounded.png";

function isCurrent(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (searchOpen) {
          setSearchOpen(false);
          searchButtonRef.current?.focus();
          return;
        }

        if (mobileOpen) {
          setMobileOpen(false);
          mobileButtonRef.current?.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, searchOpen]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = searchQuery.trim();
    if (value) {
      window.location.href = `/blog?search=${encodeURIComponent(value)}`;
    }
  }

  const nav = (
    <ul className="flex flex-col md:flex-row md:items-center">
      {NAV_ITEMS.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
            className={cn(
              "block px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#035a9e] hover:shadow-[inset_0_-4px_0_#fff] focus-visible:bg-[#035a9e] focus-visible:shadow-[inset_0_-4px_0_#fff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:py-5",
              isCurrent(pathname, item.href) &&
                "bg-[#035a9e] shadow-[inset_0_-4px_0_#fff]"
            )}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <header className="site-header sticky top-0 z-40 bg-[#0066bf] text-white shadow-sm">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-[#035a9e]"
      >
        Skip to content
      </a>
      <div className="mx-auto flex w-full max-w-none items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Link
          href="/"
          aria-label="iAccessibility home"
          className="flex min-h-[60px] items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_URL}
            alt=""
            aria-hidden="true"
            className="h-11 w-11 rounded-lg"
          />
          <span className="hidden text-lg font-bold sm:inline">
            iAccessibility
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden self-stretch bg-[#0f6cba] md:block"
        >
          {nav}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            ref={searchButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            className="text-white hover:bg-[#035a9e]"
            aria-label="Search"
            aria-expanded={searchOpen}
            aria-controls={searchOpen ? "site-search" : undefined}
            onClick={() => setSearchOpen((open) => !open)}
          >
            {searchOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Search className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
          <AuthMenu />
          <Button
            ref={mobileButtonRef}
            type="button"
            variant="ghost"
            size="icon"
            className="text-white hover:bg-[#035a9e] md:hidden"
            aria-label="Menu"
            aria-expanded={mobileOpen}
            aria-controls={mobileOpen ? "mobile-navigation" : undefined}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {searchOpen ? (
        <form
          id="site-search"
          role="search"
          onSubmit={handleSearchSubmit}
          className="border-t border-white/20 bg-[#035a9e] px-4 py-3"
        >
          <div className="mx-auto flex max-w-3xl gap-2">
            <label htmlFor="site-search-input" className="sr-only">
              Search iAccessibility
            </label>
            <input
              ref={searchInputRef}
              id="site-search-input"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-white/60 px-3 py-2 text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              placeholder="Search iAccessibility"
            />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </div>
        </form>
      ) : null}

      {mobileOpen ? (
        <nav
          id="mobile-navigation"
          aria-label="Mobile primary"
          className="border-t border-white/20 bg-[#0f6cba] md:hidden"
        >
          {nav}
          <MobileAuthActions />
        </nav>
      ) : null}
    </header>
  );
}
