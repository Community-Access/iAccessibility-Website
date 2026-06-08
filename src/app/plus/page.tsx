import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCurrentAppUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Community Resources"
};

const resourceLinks = [
  {
    href: "/report#submit-report",
    title: "Submit to the Report",
    detail: "Send a review, tip, or accessibility update."
  },
  {
    href: "/app-directory/submit",
    title: "Submit an app",
    detail: "Add an app to the iAccessibility App Directory."
  },
  {
    href: "/events",
    title: "Events",
    detail: "Find live streams, workshops, and community events."
  },
  {
    href: "/iacast-network",
    title: "iACast Network",
    detail: "Browse podcasts and episodes from the network."
  },
  {
    href: "/app-directory",
    title: "App Directory",
    detail: "Search accessible apps by platform, category, and rating."
  }
];

export default async function CommunityResourcesPage() {
  const user = await getCurrentAppUser();

  return (
    <div className="wp-container space-y-8">
      <section className="wp-article">
        <h1 className="text-3xl font-bold">Community Resources</h1>
        <p className="mt-4 max-w-3xl text-lg text-[#595959]">
          Links for contributing, finding events, and using iAccessibility
          community tools.
        </p>
        {!user ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/auth/sign-in">Log In</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/sign-up">Create Account</Link>
            </Button>
          </div>
        ) : null}
      </section>

      <section className="wp-article">
        <h2 className="text-2xl font-semibold">Links</h2>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {resourceLinks.map((item) => (
            <li key={item.href} className="rounded-lg border border-[#767676] bg-white p-4">
              <h3 className="text-lg font-semibold">
                <Link
                  href={item.href}
                  className="text-[#0f6cba] underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {item.title}
                </Link>
              </h3>
              <p className="mt-1 text-[#595959]">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      {user ? (
        <section className="wp-article">
          <h2 className="text-2xl font-semibold">Account</h2>
          <p className="mt-2 text-[#595959]">
            You are signed in and can submit content for review.
          </p>
          <p className="mt-4">
            <Link
              href="/account/profile"
              className="inline-flex rounded-md bg-[#0066bf] px-4 py-2 font-semibold text-white no-underline hover:bg-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
            >
              Open Profile
            </Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}
