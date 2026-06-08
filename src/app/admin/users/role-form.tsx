"use client";

import { useActionState } from "react";
import type { AppRole } from "@/lib/auth/server";
import {
  initialUpdateUserRoleState,
  updateUserRole
} from "./actions";

export function UserRoleForm({
  id,
  name,
  role,
  isCurrentUser
}: {
  id: number;
  name: string;
  role: AppRole;
  isCurrentUser: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateUserRole,
    initialUpdateUserRoleState
  );
  const statusId = `role-status-${id}`;
  const errorId = `role-error-${id}`;

  if (isCurrentUser) {
    return (
      <span className="text-sm text-[#595959]">
        Current administrator account
      </span>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex max-w-full flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <label htmlFor={`role-${id}`} className="sr-only">
          Role for {name}
        </label>
        <select
          id={`role-${id}`}
          name="role"
          defaultValue={role}
          aria-describedby={
            state.status === "success"
              ? statusId
              : state.status === "error"
                ? errorId
                : undefined
          }
          className="max-w-full rounded-md border border-[#767676] bg-white px-3 py-2 text-sm text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
        >
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
          <option value="member">Member</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          aria-label={`Update role for ${name}`}
          className="rounded-md bg-[#0066bf] px-3 py-2 text-sm font-semibold text-white hover:bg-[#035a9e] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
        >
          {pending ? "Updating..." : "Update"}
        </button>
      </div>
      <p
        id={statusId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={
          state.status === "success"
            ? "text-sm font-semibold text-[#166534]"
            : "sr-only"
        }
      >
        {state.status === "success" ? state.message : ""}
      </p>
      <p
        id={errorId}
        role="alert"
        aria-atomic="true"
        className={
          state.status === "error"
            ? "text-sm font-semibold text-[#b91c1c]"
            : "sr-only"
        }
      >
        {state.status === "error" ? state.message : ""}
      </p>
    </form>
  );
}
