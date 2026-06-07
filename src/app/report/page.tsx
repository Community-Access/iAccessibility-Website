import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ContentList } from "@/components/layout/content-list";
import { Pagination } from "@/components/layout/pagination";
import { ReportSubmissionForm } from "@/components/forms/report-submission-form";
import { getPostsPage } from "@/lib/content/wordpress";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const { posts, page: activePage, totalPages } = await getPostsPage(
    Math.max(1, Number(page) || 1),
    12
  );

  return (
    <div className="wp-container space-y-8">
      <section className="wp-article text-center">
        <h1 className="text-3xl font-bold">iAccessibility Report</h1>
        <p className="mx-auto mt-4 max-w-3xl text-lg">
          Submit your review, tip, or information to the iAccessibility Report.
          Signed-in members can submit content for review.
        </p>
        <div className="mt-5">
          <Button asChild>
            <Link href="#submit-report">Submit to the Report</Link>
          </Button>
        </div>
      </section>

      <section className="wp-article">
        <ContentList title="Latest Posts" items={posts} />
        <Pagination
          page={activePage}
          totalPages={totalPages}
          hrefFor={(p) => `/report?page=${p}#latest-posts-heading`}
        />
      </section>

      <ReportSubmissionForm />
    </div>
  );
}
