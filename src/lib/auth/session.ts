import "server-only";

import { redirect } from "next/navigation";

import { auth } from "./server";
import type { AuthIdentity } from "./identity";
import { getUserRecord, type CurrentUser } from "./user";
import { hasPermission, type Capability, type UserRole } from "./roles";

// Read the signed-in identity from the managed Neon Auth session and normalize
// it to our AuthIdentity shape. This is the single binding point between the
// auth provider and the provider-agnostic RBAC/upsert layer. Null when signed
// out.
export async function getAuthIdentity(): Promise<AuthIdentity | null> {
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user) return null;
  return {
    authUserId: user.id,
    email: user.email,
    displayName: user.name ?? null,
    avatarUrl: user.image ?? null,
  };
}

// The current user as stored in OUR table, carrying the role. Upserts on first
// sign-in (and refreshes profile fields thereafter). Null when signed out.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const identity = await getAuthIdentity();
  const record = await getUserRecord(identity);
  if (!record) return null;
  return { record, role: record.role };
}

// Current role only, or null when signed out. Convenience for gating.
export async function getCurrentRole(): Promise<UserRole | null> {
  const current = await getCurrentUser();
  return current?.role ?? null;
}

// Require an authenticated user; redirect to sign-in otherwise. Returns the
// resolved CurrentUser.
export async function requireUser(
  signInPath = "/auth/sign-in",
): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (!current) redirect(signInPath);
  return current;
}

// Require a specific capability; redirect signed-out users to sign-in and
// authenticated-but-unauthorized users to a 403 page. Server-enforced — the
// authoritative gate behind any admin/moderation route or action.
export async function requireCapability(
  capability: Capability,
  opts: { signInPath?: string; forbiddenPath?: string } = {},
): Promise<CurrentUser> {
  const { signInPath = "/auth/sign-in", forbiddenPath = "/403" } = opts;
  const current = await getCurrentUser();
  if (!current) redirect(signInPath);
  if (!hasPermission(current.role, capability)) redirect(forbiddenPath);
  return current;
}

// Non-redirecting capability check for server logic / conditional rendering.
export async function currentUserCan(
  capability: Capability,
): Promise<boolean> {
  const role = await getCurrentRole();
  return hasPermission(role, capability);
}
