import { redirect } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { users } from "@/db/schema";
import { canAdmin, getCurrentAppUser, type AppRole } from "@/lib/auth/server";
import { UsersTable, type UserRow } from "./users-table";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Users"
};

async function roleCount(role: AppRole) {
  if (!hasDatabase || !db) return 0;
  const [row] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.role, role));
  return row?.value ?? 0;
}

async function totalUserCount() {
  if (!hasDatabase || !db) return 0;
  const [row] = await db.select({ value: count() }).from(users);
  return row?.value ?? 0;
}

export default async function AdminUsersPage() {
  const currentUser = await getCurrentAppUser();
  if (!canAdmin(currentUser?.role)) redirect("/admin");

  const [rows, totalUsers, adminUsers, moderatorUsers, memberUsers]: [
    UserRow[],
    number,
    number,
    number,
    number
  ] =
    hasDatabase && db
      ? await Promise.all([
          db
            .select({
              id: users.id,
              email: users.email,
              displayName: users.displayName,
              role: users.role,
              createdAt: users.createdAt
            })
            .from(users)
            .orderBy(desc(users.createdAt))
            .limit(1000),
          totalUserCount(),
          roleCount("admin"),
          roleCount("moderator"),
          roleCount("member")
        ])
      : [[], 0, 0, 0, 0];

  return (
    <div className="space-y-8">
      <div className="wp-article">
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="mt-3 text-[#595959]">
          {totalUsers.toLocaleString()} total user
          {totalUsers === 1 ? "" : "s"}: {adminUsers.toLocaleString()} admin
          {adminUsers === 1 ? "" : "s"},{" "}
          {moderatorUsers.toLocaleString()} moderator
          {moderatorUsers === 1 ? "" : "s"}, and{" "}
          {memberUsers.toLocaleString()} member
          {memberUsers === 1 ? "" : "s"}.
        </p>
      </div>

      <div className="wp-article">
        <h2 id="users-table-heading" className="mb-4 text-2xl font-semibold">
          All users
        </h2>
        <UsersTable rows={rows} currentUserId={currentUser?.id} />
      </div>
    </div>
  );
}
