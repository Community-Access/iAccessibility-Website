import { DirectorySubmissionForm } from "@/components/forms/directory-submission-form";

export default function SubmitAppPage() {
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
        <DirectorySubmissionForm />
      </article>
    </div>
  );
}
