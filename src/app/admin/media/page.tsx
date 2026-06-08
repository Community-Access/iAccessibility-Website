import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { media } from "@/db/schema";
import { canAdmin, getCurrentAppUser } from "@/lib/auth/server";
import { MediaManager, type MediaRow } from "./media-manager";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Media library"
};

export default async function AdminMediaPage() {
  const user = await getCurrentAppUser();
  if (!canAdmin(user?.role)) redirect("/admin");

  const items: MediaRow[] =
    hasDatabase && db
      ? await db
          .select({
            id: media.id,
            key: media.key,
            url: media.url,
            alt: media.alt,
            mime: media.mime,
            bytes: media.bytes,
            createdAt: media.createdAt
          })
          .from(media)
          .orderBy(desc(media.createdAt))
          .limit(500)
      : [];

  return (
    <div className="space-y-8">
      <div className="wp-article">
        <h1 className="text-3xl font-bold">Media library</h1>
        <p className="mt-3 text-[#595959]">
          {items.length.toLocaleString()} item{items.length === 1 ? "" : "s"}.
        </p>
      </div>

      <div className="wp-article">
        <h2
          id="media-library-heading"
          tabIndex={-1}
          className="mb-4 text-2xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          All media
        </h2>
        <MediaManager items={items} />
      </div>
    </div>
  );
}
