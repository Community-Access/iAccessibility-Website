import { redirect } from "next/navigation";
import Link from "next/link";
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
            <dd>{user.displayName || "Member"}</dd>
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
        <p className="mt-6">
          <Link
            href="/account/content"
            className="font-semibold text-[#0f6cba] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            View my content
          </Link>
        </p>
      </article>
    </div>
  );
}
