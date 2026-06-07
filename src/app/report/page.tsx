import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ContentList } from "@/components/layout/content-list";
import { ReportSubmissionForm } from "@/components/forms/report-submission-form";
import { getLatestPosts } from "@/lib/content/wordpress";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const posts = await getLatestPosts(12);

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
            <Link href="#submit-report">Submit Report</Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="wp-article">
          <ContentList title="Latest Report Posts" items={posts} />
        </div>
        <ReportSubmissionForm />
      </div>
    </div>
  );
}
