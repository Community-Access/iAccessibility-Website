import { redirect } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { users } from "@/db/schema";
import { ItemTable, type ItemTableColumn } from "@/components/ui/item-table";
import { canAdmin, getCurrentAppUser, type AppRole } from "@/lib/auth/server";
import { formatDate } from "@/lib/utils";
import { UserRoleForm } from "./role-form";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Users"
};

type UserRow = {
  id: number;
  email: string;
  displayName: string | null;
  role: AppRole;
  createdAt: Date;
  updatedAt: Date;
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

function displayName(user: Pick<UserRow, "displayName" | "email">) {
  return user.displayName || user.email;
}

function roleLabel(role: AppRole) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function Stat({
  label,
  value
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-[#767676] bg-white p-4 shadow-wordpress">
      <p className="text-sm font-semibold uppercase text-[#595959]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#222222]">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

export default async function AdminUsersPage() {
  const currentUser = await getCurrentAppUser();
  if (!canAdmin(currentUser?.role)) redirect("/admin");

  const [rows, totalUsers, adminUsers, moderatorUsers, memberUsers] =
    hasDatabase && db
      ? await Promise.all([
          db
            .select({
              id: users.id,
              email: users.email,
              displayName: users.displayName,
              role: users.role,
              createdAt: users.createdAt,
              updatedAt: users.updatedAt
            })
            .from(users)
            .orderBy(desc(users.createdAt))
            .limit(100),
          totalUserCount(),
          roleCount("admin"),
          roleCount("moderator"),
          roleCount("member")
        ])
      : [[], 0, 0, 0, 0];

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
          isCurrentUser={user.id === currentUser?.id}
        />
      )
    }
  ];

  return (
    <div className="space-y-8">
      <div className="wp-article">
        <h1 className="text-3xl font-bold">Users</h1>
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-semibold">User counts</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Total users" value={totalUsers} />
          <Stat label="Admins" value={adminUsers} />
          <Stat label="Moderators" value={moderatorUsers} />
          <Stat label="Members" value={memberUsers} />
        </div>
      </div>

      <div className="wp-article">
        <h2 id="users-table-heading" className="mb-4 text-2xl font-semibold">
          All users
        </h2>
        <ItemTable
          caption="All users"
          headingId="recent-users-table"
          columns={columns}
          items={rows}
          getItemKey={(user) => String(user.id)}
          emptyTitle="No users yet"
          emptyMessage="New accounts will appear here after sign up."
        />
      </div>
    </div>
  );
}
