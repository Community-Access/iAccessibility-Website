import { getPageBySlug } from "@/lib/content/wordpress";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const page = await getPageBySlug("about");

  return (
    <div className="wp-container">
      <article className="wp-article">
        <h1 className="mb-6 text-3xl font-bold">About</h1>
        {page?.html ? (
          <div className="wp-prose" dangerouslySetInnerHTML={{ __html: page.html }} />
        ) : (
          <div className="wp-prose">
            <h2>Mission</h2>
            <p>
              iAccessibility believes that technology is key to success, and we
              believe in making success accessible to everyone.
            </p>
          </div>
        )}
      </article>
    </div>
  );
}
