"use client";

import dynamic from "next/dynamic";
import type { PostEditorCategory } from "./post-editor";

// The editor uses browser focus and clipboard APIs, so load it client-only.
const PostEditor = dynamic(() => import("./post-editor"), {
  ssr: false,
  loading: () => <p className="wp-article">Loading the editor…</p>
});

export function PostEditorLoader({
  categories
}: {
  categories: PostEditorCategory[];
}) {
  return <PostEditor categories={categories} />;
}
