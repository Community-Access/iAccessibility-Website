"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Plus, Shield, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";

type AppRole = "admin" | "moderator" | "member";

function canAccessAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "moderator";
}

function useAppRole(userId?: string | null, fallbackRole?: string | null) {
  const [role, setRole] = useState<string | null>(fallbackRole ?? null);

  useEffect(() => {
    if (!userId) {
      setRole(null);
      return;
    }

    let active = true;
    setRole(fallbackRole ?? null);

    fetch("/api/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as {
          user?: { role?: AppRole | null } | null;
        };
      })
      .then((payload) => {
        if (active) setRole(payload?.user?.role ?? fallbackRole ?? null);
      })
      .catch(() => {
        if (active) setRole(fallbackRole ?? null);
      });

    return () => {
      active = false;
    };
  }, [fallbackRole, userId]);

  return role;
}

function Avatar({
  name,
  image
}: {
  name: string;
  image?: string | null;
}) {
  const [error, setError] = useState(false);
  const initials = name.trim().charAt(0).toUpperCase() || "i";

  if (image && !error) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        aria-hidden="true"
        className="h-7 w-7 rounded-full object-cover"
        onError={() => setError(true)}
      />
    );
  }

  return (
    <span
      className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[#035a9e]"
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export function AuthMenu() {
  const router = useRouter();
  const session = authClient.useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const user = session.data?.user;
  const displayName = user?.name || user?.email || "Account";
  const appRole = useAppRole(user?.id, user?.role);

  useEffect(() => {
    if (open && menuRef.current) {
      const firstItem =
        menuRef.current.querySelector<HTMLElement>('[role="menuitem"]');
      firstItem?.focus();
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleMenuKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!menuRef.current) return;

    const items = Array.from(
      menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]')
    );
    const index = items.indexOf(document.activeElement as HTMLElement);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        items[(index + 1) % items.length]?.focus();
        break;
      case "ArrowUp":
        event.preventDefault();
        items[(index - 1 + items.length) % items.length]?.focus();
        break;
      case "Home":
        event.preventDefault();
        items[0]?.focus();
        break;
      case "End":
        event.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }, []);

  async function handleSignOut() {
    setOpen(false);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  if (session.isPending) {
    return (
      <div
        className="h-9 w-20 rounded-md bg-white/20"
        role="status"
      >
        <span className="sr-only">Loading account</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="hidden items-center gap-2 lg:flex">
        <Link
          href="/auth/sign-in"
          className="rounded-md px-3 py-2 text-sm font-semibold text-white hover:bg-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Log In
        </Link>
        <Link
          href="/auth/sign-up"
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#035a9e] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`User menu for ${displayName}`}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <Avatar name={displayName} image={user.image} />
        <span className="hidden max-w-36 truncate sm:inline">{displayName}</span>
        <ChevronDown className="hidden h-4 w-4 sm:inline" aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-56 rounded-lg border border-border bg-background py-1 text-foreground shadow-lg">
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            {user.email ? (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            ) : null}
          </div>

          <div role="menu" aria-label="User menu" onKeyDown={handleMenuKeyDown}>
            <Link
              href="/account/profile"
              role="menuitem"
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground no-underline hover:bg-muted focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#035a9e]"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              My Profile
            </Link>

            <Link
              href="/app-directory/submit"
              role="menuitem"
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground no-underline hover:bg-muted focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#035a9e]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Submit App
            </Link>

            {canAccessAdminRole(appRole) ? (
              <Link
                href="/admin"
                role="menuitem"
                tabIndex={-1}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-foreground no-underline hover:bg-muted focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#035a9e]"
              >
                <Shield className="h-4 w-4" aria-hidden="true" />
                Admin
              </Link>
            ) : null}

            <div role="separator" className="mt-1 border-t border-border" />
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#035a9e]"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MobileAuthActions() {
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user;
  const appRole = useAppRole(user?.id, user?.role);

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  if (session.isPending) {
    return (
      <div role="status" className="px-4 py-2 text-sm text-white">
        Loading account
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        <Link
          href="/auth/sign-in"
          className="rounded-md border border-white/50 px-3 py-2 text-center text-sm font-semibold text-white"
        >
          Log In
        </Link>
        <Link
          href="/auth/sign-up"
          className="rounded-md bg-white px-3 py-2 text-center text-sm font-semibold text-[#035a9e]"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-2 px-4 pb-4">
      <Link
        href="/account/profile"
        className="rounded-md border border-white/50 px-3 py-2 text-center text-sm font-semibold text-white"
      >
        My Profile
      </Link>
      <Link
        href="/app-directory/submit"
        className="rounded-md border border-white/50 px-3 py-2 text-center text-sm font-semibold text-white"
      >
        Submit App
      </Link>
      {canAccessAdminRole(appRole) ? (
        <Link
          href="/admin"
          className="rounded-md border border-white/50 px-3 py-2 text-center text-sm font-semibold text-white"
        >
          Admin
        </Link>
      ) : null}
      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#035a9e]"
      >
        Sign Out
      </button>
    </div>
  );
}
