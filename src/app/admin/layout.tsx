import { redirect } from "next/navigation";
import { canAdmin, canModerate, getCurrentAppUser } from "@/lib/auth/server";
import { AdminNav, type AdminSection } from "./admin-nav";

// `adminOnly` sections are hidden from moderators AND guarded server-side in
// each page (defense in depth — never rely on hiding the nav link alone).
const ALL_SECTIONS: Array<AdminSection & { adminOnly: boolean }> = [
  { href: "/admin", label: "Dashboard", adminOnly: false },
  { href: "/admin/review", label: "Pending review", adminOnly: false },
  { href: "/admin/comments", label: "Comments", adminOnly: false },
  { href: "/admin/posts", label: "Posts", adminOnly: true },
  { href: "/admin/media", label: "Media", adminOnly: true },
  { href: "/admin/events", label: "Events", adminOnly: true },
  { href: "/admin/podcasts", label: "Podcasts", adminOnly: true },
  { href: "/admin/users", label: "Users", adminOnly: true }
];

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentAppUser();

  if (!user) redirect("/auth/sign-in");
  if (!canModerate(user.role)) redirect("/");

  const isAdmin = canAdmin(user.role);
  const sections = ALL_SECTIONS.filter(
    (section) => !section.adminOnly || isAdmin
  ).map(({ href, label }) => ({ href, label }));

  return (
    <div className="wp-container">
      <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <AdminNav sections={sections} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
