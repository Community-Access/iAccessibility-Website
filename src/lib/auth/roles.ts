// RBAC: three roles, server-enforced capabilities.
//
// admin     — full access: admin panel, user management, API-key management,
//             all content, and reviewing/approving every submission.
// moderator — everything EXCEPT the admin panel. Cannot manage users or API
//             keys. CAN review/approve directory + blog submissions and manage
//             content.
// member    — basic authenticated user. Can submit/upload content (directory
//             entries, authored posts) into the review queue. No moderation or
//             admin actions.
//
// The role enum mirrors src/db/schema.ts (userRoleEnum). Capabilities are gated
// here and checked server-side; client gating is presentation only.

import { userRoleEnum, type UserRole } from "@/db/schema";

export type { UserRole };

// Source of truth for valid roles, reused for membership checks and defaults.
export const ROLES = userRoleEnum.enumValues;
export const DEFAULT_ROLE: UserRole = "member";

export function isRole(value: unknown): value is UserRole {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

// Capabilities are the unit of authorization. Routes, server actions, and UI
// gating all ask hasPermission(role, capability) rather than checking the role
// name directly, so the matrix below stays the single source of truth.
export type Capability =
  // Admin-only.
  | "access:admin-panel"
  | "manage:users"
  | "manage:api-keys"
  | "manage:syndication"
  // Moderation (admin + moderator).
  | "review:directory"
  | "review:blog"
  | "manage:content" // create/edit/delete posts, pages, guidelines, directory
  | "manage:podcasts" // shows + episodes (admin/moderator only per spec)
  | "manage:media"
  // Authenticated member baseline.
  | "submit:directory"
  | "submit:blog"
  | "upload:media";

// Capabilities granted to every authenticated member. Moderators and admins
// inherit these.
const MEMBER_CAPS: readonly Capability[] = [
  "submit:directory",
  "submit:blog",
  "upload:media",
];

// Capabilities moderators add on top of the member baseline.
const MODERATOR_CAPS: readonly Capability[] = [
  ...MEMBER_CAPS,
  "review:directory",
  "review:blog",
  "manage:content",
  "manage:podcasts",
  "manage:media",
];

// Admins add admin-panel + user/API-key/syndication management on top of
// everything a moderator can do.
const ADMIN_CAPS: readonly Capability[] = [
  ...MODERATOR_CAPS,
  "access:admin-panel",
  "manage:users",
  "manage:api-keys",
  "manage:syndication",
];

const CAPABILITIES: Record<UserRole, readonly Capability[]> = {
  member: MEMBER_CAPS,
  moderator: MODERATOR_CAPS,
  admin: ADMIN_CAPS,
};

export function hasPermission(
  role: UserRole | null | undefined,
  capability: Capability,
): boolean {
  if (!role) return false;
  return CAPABILITIES[role].includes(capability);
}

// Convenience predicates for the common gates.
export function canAccessAdminPanel(role: UserRole | null | undefined): boolean {
  return hasPermission(role, "access:admin-panel");
}

export function canModerate(role: UserRole | null | undefined): boolean {
  // "Can reach the review queue at all" — directory or blog review.
  return (
    hasPermission(role, "review:directory") ||
    hasPermission(role, "review:blog")
  );
}
