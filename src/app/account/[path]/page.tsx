import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/auth/server";

export default async function AccountPage() {
  const user = await getCurrentAppUser();

  if (!user) redirect("/auth/sign-in");

  return (
    <div className="wp-container">
      <article className="wp-article">
        <h1 className="text-3xl font-bold">Account</h1>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-semibold text-muted-foreground">Name</dt>
            <dd>{user.displayName || user.username || "Member"}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-muted-foreground">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-muted-foreground">Role</dt>
            <dd className="capitalize">{user.role}</dd>
          </div>
        </dl>
      </article>
    </div>
  );
}
