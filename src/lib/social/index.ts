// Auto-posts newly published content to the iAccessibility social accounts.
// Each network only fires when its credentials are configured; otherwise it is
// a safe no-op so the publish flow never fails because social posting is unset.

export type SocialPost = {
  title: string;
  url: string;
  excerpt?: string | null;
};

export async function postToSocialMedia(post: SocialPost): Promise<void> {
  await Promise.allSettled([
    postToMastodon(post),
    postToX(post),
    postToFacebook(post)
  ]);
}

function composeStatus({ title, url, excerpt }: SocialPost) {
  const summary = excerpt?.trim() ? `${excerpt.trim()}\n\n` : "";
  return `${title}\n\n${summary}${url}`.slice(0, 480);
}

/**
 * Mastodon — token-based, fully wired.
 * Requires MASTODON_API_BASE (e.g. https://iaccessibility.social) and
 * MASTODON_ACCESS_TOKEN (an access token with the `write:statuses` scope).
 */
async function postToMastodon(post: SocialPost): Promise<void> {
  const base = process.env.MASTODON_API_BASE;
  const token = process.env.MASTODON_ACCESS_TOKEN;
  if (!base || !token) return;

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/v1/statuses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status: composeStatus(post), visibility: "public" })
    });
    if (!res.ok) {
      console.error("Mastodon post failed:", res.status, await res.text());
    }
  } catch (error) {
    console.error("Mastodon post error:", error);
  }
}

/**
 * X (Twitter) — requires an OAuth 2.0 user-context app and a stored token.
 * Not posted until X_ACCESS_TOKEN is configured (OAuth app setup required).
 */
async function postToX(post: SocialPost): Promise<void> {
  const token = process.env.X_ACCESS_TOKEN;
  if (!token) return;

  try {
    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: composeStatus(post) })
    });
    if (!res.ok) {
      console.error("X post failed:", res.status, await res.text());
    }
  } catch (error) {
    console.error("X post error:", error);
  }
}

/**
 * Facebook Page — requires a Page ID and a long-lived Page access token.
 * Not posted until FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN are set.
 */
async function postToFacebook(post: SocialPost): Promise<void> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) return;

  try {
    const params = new URLSearchParams({
      message: `${post.title}\n\n${post.excerpt?.trim() ?? ""}`.trim(),
      link: post.url,
      access_token: token
    });
    const res = await fetch(
      `https://graph.facebook.com/${pageId}/feed`,
      { method: "POST", body: params }
    );
    if (!res.ok) {
      console.error("Facebook post failed:", res.status, await res.text());
    }
  } catch (error) {
    console.error("Facebook post error:", error);
  }
}
