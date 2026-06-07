import { createNeonAuth } from "@neondatabase/auth/next/server";
import { eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { users } from "@/db/schema";
import { notifyAdminNewUser, sendWelcomeEmail } from "@/lib/email/client";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!
  }
});

export type AppRole = "admin" | "moderator" | "member";

type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  username?: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const { data: session } = await auth.getSession();
  return (session?.user as SessionUser | undefined) ?? null;
}

export async function getCurrentAppUser() {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.id || !sessionUser.email || !hasDatabase || !db) {
    return null;
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.authUserId, sessionUser.id)
  });

  if (existing) return existing;

  const byEmail = await db.query.users.findFirst({
    where: eq(users.email, sessionUser.email)
  });

  if (byEmail) {
    // A record already exists for this email (e.g. a migrated/seeded admin).
    // "Claim" it by linking it to the current auth identity so future logins
    // resolve directly by auth id instead of falling back to email.
    if (byEmail.authUserId !== sessionUser.id) {
      const [linked] = await db
        .update(users)
        .set({ authUserId: sessionUser.id, updatedAt: new Date() })
        .where(eq(users.id, byEmail.id))
        .returning();
      return linked ?? byEmail;
    }
    return byEmail;
  }

  const inserted = await db
    .insert(users)
    .values({
      authUserId: sessionUser.id,
      email: sessionUser.email,
      displayName: sessionUser.name ?? sessionUser.email.split("@")[0],
      role: "member"
    })
    .returning();

  const created = inserted[0] ?? null;

  if (created) {
    // New member just created — fire welcome + admin notification.
    void sendWelcomeEmail(created.email, created.displayName);
    void notifyAdminNewUser({ email: created.email, name: created.displayName });
  }

  return created;
}

export function canModerate(role: AppRole | null | undefined) {
  return role === "admin" || role === "moderator";
}

export function canAdmin(role: AppRole | null | undefined) {
  return role === "admin";
}
