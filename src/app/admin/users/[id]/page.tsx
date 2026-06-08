import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { users } from "@/db/schema";
import { canAdmin, getCurrentAppUser } from "@/lib/auth/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "User profile"
};

export default async function UserProfilePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const current = await getCurrentAppUser();
  if (!canAdmin(current?.role)) redirect("/admin");

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) notFound();

  const [user] =
    hasDatabase && db
      ? await db
          .select({
            id: users.id,
            email: users.email,
            displayName: users.displayName,
            role: users.role,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1)
      : [];

  if (!user) notFound();

  const name = user.displayName || user.email;

  return (
    <div className="space-y-6">
      <p>
        <Link
          href="/admin/users"
          className="text-[#0f6cba] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Back to all users
        </Link>
      </p>

      <div className="wp-article">
        <h1 className="text-3xl font-bold">{name}</h1>
        <dl className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
          <dt className="font-semibold text-[#222222]">Name</dt>
          <dd className="text-[#222222]">{user.displayName || "—"}</dd>

          <dt className="font-semibold text-[#222222]">Email</dt>
          <dd className="text-[#222222]">{user.email}</dd>

          <dt className="font-semibold text-[#222222]">Role</dt>
          <dd className="capitalize text-[#222222]">{user.role}</dd>

          <dt className="font-semibold text-[#222222]">Joined</dt>
          <dd className="text-[#222222]">{formatDate(user.createdAt)}</dd>

          <dt className="font-semibold text-[#222222]">Last updated</dt>
          <dd className="text-[#222222]">{formatDate(user.updatedAt)}</dd>
        </dl>
      </div>
    </div>
  );
}
