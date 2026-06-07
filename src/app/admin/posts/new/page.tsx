import { redirect } from "next/navigation";
import { canAdmin, getCurrentAppUser } from "@/lib/auth/server";
import { PostEditorLoader } from "@/components/admin/post-editor-loader";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const user = await getCurrentAppUser();
  if (!canAdmin(user?.role)) redirect("/admin");

  return (
    <div className="space-y-6">
      <section className="wp-article">
        <h1 className="text-3xl font-bold">New post</h1>
        <p className="mt-3 text-[#595959]">
          Write a post with the accessible editor. Publishing immediately makes it
          live and announces it on the social accounts.
        </p>
      </section>
      <PostEditorLoader />
    </div>
  );
}
