"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { useId, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { createPost } from "@/app/admin/posts/actions";

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/media/upload", {
    method: "POST",
    body: fd
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Image upload failed.");
  return data.url as string;
}

function isRedirect(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export default function PostEditor() {
  const editor = useCreateBlockNote({ uploadFile: uploadImage });
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const bodyId = `${baseId}-body`;
  const fileId = `${baseId}-file`;
  const altId = `${baseId}-alt`;
  const errorId = `${baseId}-error`;

  const titleRef = useRef<HTMLInputElement>(null);
  const altRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [featuredUrl, setFeaturedUrl] = useState("");
  const [featuredAlt, setFeaturedAlt] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState<"title" | "alt" | null>(null);

  function fail(field: "title" | "alt", message: string) {
    setError(message);
    setInvalidField(field);
    (field === "title" ? titleRef : altRef).current?.focus();
  }

  function removeFeatured() {
    setFeaturedUrl("");
    setFeaturedAlt("");
    if (invalidField === "alt") setInvalidField(null);
  }

  async function onFeaturedChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      setFeaturedUrl(await uploadImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInvalidField(null);
    if (!title.trim()) {
      fail("title", "Please enter a title.");
      return;
    }
    if (featuredUrl && !featuredAlt.trim()) {
      fail(
        "alt",
        "Please describe the featured image (alt text) so it is accessible."
      );
      return;
    }
    setSaving(true);
    try {
      const html = await editor.blocksToFullHTML(editor.document);
      await createPost({
        title,
        html,
        featuredImageUrl: featuredUrl || null,
        featuredImageAlt: featuredAlt || null,
        status
      });
    } catch (err) {
      if (isRedirect(err)) throw err; // successful redirect from the action
      setSaving(false);
      setError(err instanceof Error ? err.message : "Failed to save the post.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="wp-article space-y-5">
        <div>
          <label htmlFor={titleId} className="block text-sm font-semibold">
            Title
          </label>
          <input
            id={titleId}
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            aria-invalid={invalidField === "title" || undefined}
            aria-describedby={invalidField === "title" ? errorId : undefined}
            className="mt-1 w-full rounded-md border border-[#6b6b6b] bg-white px-3 py-2 text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">
            Featured image (optional)
          </legend>
          {featuredUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={featuredUrl}
              alt={featuredAlt || ""}
              className="max-h-48 rounded-md border border-border"
            />
          ) : null}
          <div>
            <label htmlFor={fileId} className="block text-sm">
              Choose an image
            </label>
            <input
              id={fileId}
              type="file"
              accept="image/*"
              onChange={onFeaturedChange}
              className="mt-1 block rounded-md text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#0066bf] file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-[#035a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
            />
          </div>
          <div aria-live="polite">
            {uploading ? (
              <p className="text-sm text-[#595959]">Uploading image…</p>
            ) : null}
          </div>
          {featuredUrl ? (
            <div className="space-y-2">
              <div>
                <label htmlFor={altId} className="block text-sm font-semibold">
                  Image description (alt text)
                </label>
                <input
                  id={altId}
                  ref={altRef}
                  value={featuredAlt}
                  onChange={(e) => setFeaturedAlt(e.target.value)}
                  aria-invalid={invalidField === "alt" || undefined}
                  aria-describedby={invalidField === "alt" ? errorId : undefined}
                  className="mt-1 w-full rounded-md border border-[#6b6b6b] bg-white px-3 py-2 text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
                  placeholder="Describe what the image shows"
                />
              </div>
              <button
                type="button"
                onClick={removeFeatured}
                className="rounded-md border border-[#6b6b6b] px-3 py-1.5 text-sm font-medium text-[#222222] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf]"
              >
                Remove featured image
              </button>
            </div>
          ) : null}
        </fieldset>
      </div>

      <div className="wp-article">
        <h2 id={bodyId} className="text-sm font-semibold">
          Post body
        </h2>
        <div className="mt-2 rounded-md border border-border bg-white py-2">
          <BlockNoteView editor={editor} theme="light" aria-labelledby={bodyId} />
        </div>
      </div>

      <div className="wp-article space-y-4">
        <fieldset>
          <legend className="text-sm font-semibold">Status</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="post-status"
                checked={status === "draft"}
                onChange={() => setStatus("draft")}
              />
              Save as draft
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="post-status"
                checked={status === "published"}
                onChange={() => setStatus("published")}
              />
              Publish now
            </label>
          </div>
        </fieldset>

        <div
          id={errorId}
          role="alert"
          className="min-h-[1.25rem] text-sm font-semibold text-[#b91c1c]"
        >
          {error}
        </div>

        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-md bg-[#0066bf] px-5 py-2.5 font-semibold text-white hover:bg-[#035a9e] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066bf] focus-visible:ring-offset-2"
        >
          {saving ? "Saving…" : "Save post"}
        </button>
      </div>
    </form>
  );
}
