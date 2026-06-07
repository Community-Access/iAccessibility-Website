import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users, type User, type UserRole } from "@/db/schema";
import { DEFAULT_ROLE } from "./roles";
import type { AuthIdentity } from "./identity";

// Upsert the signed-in identity into our users table. Called on first sign-in
// (and idempotently thereafter) so every authenticated identity has exactly one
// row carrying its role.
//
// Linking rules (per platform-spec "silent member migration"):
//   - Match first on authUserId (stack_user_id): the identity already claimed.
//   - Otherwise match on email: a migrated "claim later" account being claimed
//     by signing in with the same email. Bind the auth id onto that row WITHOUT
//     changing its role (preserve the migrated admin/moderator/member mapping).
//   - Otherwise insert a net-new Member.
//
// Profile fields (displayName/avatar) are refreshed from the provider on each
// call; role is NEVER overwritten here — role changes go through user
// management, not sign-in.
export async function upsertUserFromIdentity(
  identity: AuthIdentity,
): Promise<User> {
  const byAuthId = await db.query.users.findFirst({
    where: eq(users.authUserId, identity.authUserId),
  });
  if (byAuthId) {
    const [updated] = await db
      .update(users)
      .set({
        // Email can change upstream; keep ours in sync.
        email: identity.email,
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, byAuthId.id))
      .returning();
    return updated;
  }

  // "Claim later" path: a migrated row exists for this email but has no auth id
  // bound yet. Bind it; preserve its migrated role.
  const byEmail = await db.query.users.findFirst({
    where: eq(users.email, identity.email),
  });
  if (byEmail) {
    const [claimed] = await db
      .update(users)
      .set({
        authUserId: identity.authUserId,
        displayName: identity.displayName ?? byEmail.displayName,
        avatarUrl: identity.avatarUrl ?? byEmail.avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, byEmail.id))
      .returning();
    return claimed;
  }

  const [created] = await db
    .insert(users)
    .values({
      authUserId: identity.authUserId,
      email: identity.email,
      displayName: identity.displayName,
      avatarUrl: identity.avatarUrl,
      role: DEFAULT_ROLE,
    })
    .returning();
  return created;
}

// The current user as stored in OUR table (carries the role). Null when not
// signed in. Provider-agnostic: takes the already-resolved identity.
export async function getUserRecord(
  identity: AuthIdentity | null,
): Promise<User | null> {
  if (!identity) return null;
  return upsertUserFromIdentity(identity);
}

export type CurrentUser = {
  record: User;
  role: UserRole;
};
