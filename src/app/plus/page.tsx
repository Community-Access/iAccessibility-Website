import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getPageBySlug } from "@/lib/content/wordpress";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const page = await getPageBySlug("plus");

  return (
    <div className="wp-container">
      <article className="wp-article">
        <h1 className="mb-6 text-3xl font-bold">iAccessibility Community</h1>
        {page?.html ? (
          <div className="wp-prose" dangerouslySetInnerHTML={{ __html: page.html }} />
        ) : (
          <p>
            Join the iAccessibility community for free to participate in
            discussion, submit content, and help make technology more accessible.
          </p>
        )}
        <div className="mt-6">
          <Button asChild>
            <Link href="/auth/sign-up">Sign Up</Link>
          </Button>
        </div>
      </article>
    </div>
  );
}
