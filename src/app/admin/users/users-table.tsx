"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ItemTable, type ItemTableColumn } from "@/components/ui/item-table";
import type { AppRole } from "@/lib/auth/server";
import { formatDate } from "@/lib/utils";
import { UserRoleForm } from "./role-form";

export type UserRow = {
  id: number;
  email: string;
  displayName: string | null;
  role: AppRole;
  createdAt: Date;
};

const PAGE_SIZE = 20;

function displayName(user: Pick<UserRow, "displayName" | "email">) {
  return user.displayName || user.email;
}

function roleLabel(role: AppRole) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function UsersTable({
  rows,
  currentUserId
}: {
  rows: UserRow[];
  currentUserId?: number;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [announcement, setAnnouncement] = useState("");
  const statusRef = useRef<HTMLParagraphElement>(null);
  const firstRender = useRef(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (user) =>
        (user.displayName ?? "").toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  // Debounced result-count announcement (polite), so typing doesn't spam.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const q = query.trim();
      setAnnouncement(
        q
          ? filtered.length === 0
            ? `No users match "${q}".`
            : `${filtered.length} user${filtered.length === 1 ? "" : "s"} match "${q}".`
          : `${filtered.length} user${filtered.length === 1 ? "" : "s"}.`
      );
    }, 400);
    return () => window.clearTimeout(timer);
  }, [filtered.length, query]);

  // On page change (not first render), move focus to the page status so focus
  // never falls to <body> when a prev/next button becomes disabled at a bound.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    statusRef.current?.focus();
  }, [safePage]);

  const columns: ItemTableColumn<UserRow>[] = [
    {
      key: "user",
      header: "User",
      rowHeader: true,
      render: (user) => (
        <span className="block">
          <span className="block font-semibold">{displayName(user)}</span>
          {user.displayName ? (
            <span className="block text-sm text-[#595959]">{user.email}</span>
          ) : null}
        </span>
      )
    },
    {
      key: "role",
      header: "Role",
      render: (user) => roleLabel(user.role)
    },
    {
      key: "joined",
      header: "Joined",
      render: (user) => formatDate(user.createdAt)
    },
    {
      key: "actions",
      header: "Change role",
      render: (user) => (
        <UserRoleForm
          id={user.id}
          name={displayName(user)}
          role={user.role}
          isCurrentUser={user.id === currentUserId}
        />
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <label htmlFor="user-search" className="block text-sm font-semibold">
          Search users
        </label>
        <input
          id="user-search"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Name or email"
          className="mt-1 w-full rounded-md border border-[#767676] bg-white px-3 py-2 text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <ItemTable
        caption="All users"
        headingId="all-users-table"
        columns={columns}
        items={pageRows}
        getItemKey={(user) => String(user.id)}
        getItemHref={(user) => `/admin/users/${user.id}`}
        nameColumnKey="user"
        emptyTitle="No users found"
        emptyMessage="No users match your search."
      />

      {totalPages > 1 ? (
        <nav
          aria-label="Users pagination"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="rounded-md border border-[#767676] px-3 py-2 text-sm font-medium text-[#222222] hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Previous
          </button>
          <p
            ref={statusRef}
            tabIndex={-1}
            className="text-sm text-[#595959] focus:outline-none"
          >
            Page {safePage} of {totalPages}
          </p>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="rounded-md border border-[#767676] px-3 py-2 text-sm font-medium text-[#222222] hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Next
          </button>
        </nav>
      ) : null}
    </div>
  );
}
