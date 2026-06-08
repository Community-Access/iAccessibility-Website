import { DirectorySubmissionForm } from "@/components/forms/directory-submission-form";
import { canModerate, getCurrentAppUser } from "@/lib/auth/server";
import {
  directorySubmissionCategoryNames,
  getDirectoryCategories
} from "@/lib/content/wordpress";

export const dynamic = "force-dynamic";

export default async function SubmitAppPage() {
  const [categories, user] = await Promise.all([
    getDirectoryCategories(),
    getCurrentAppUser()
  ]);
  const categoryNames = directorySubmissionCategoryNames(
    categories.map((category) => category.name)
  );
  const publishesImmediately = canModerate(user?.role);

  return (
    <div className="wp-container">
      <article className="wp-article">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Post to the App Directory</h1>
          <p className="mt-3 text-muted-foreground">
            Submissions are saved as pending entries for admin or moderator
            review before they publish.
          </p>
        </header>
        <DirectorySubmissionForm
          categories={categoryNames}
          publishesImmediately={publishesImmediately}
        />
      </article>
    </div>
  );
}
