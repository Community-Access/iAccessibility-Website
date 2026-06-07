"use client";

import dynamic from "next/dynamic";

// BlockNote relies on browser APIs, so load it client-only.
const PostEditor = dynamic(() => import("./post-editor"), {
  ssr: false,
  loading: () => <p className="wp-article">Loading the editor…</p>
});

export function PostEditorLoader() {
  return <PostEditor />;
}
