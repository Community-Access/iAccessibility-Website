// Posts iAccessibility content to the configured social accounts.
// Each network only fires when its credentials are configured; otherwise it is
// a safe no-op so the publish flow never fails because social posting is unset.

import {
  type CalendarEvent,
  eventDateLabel,
  eventPath,
  eventTimeLabel,
  eventTypeLabel
} from "@/lib/events";
import { absoluteUrl } from "@/lib/utils";

export type SocialPost = {
  title: string;
  url: string;
  excerpt?: string | null;
};

export type SocialNetwork = "facebook" | "mastodon" | "x";

export const SOCIAL_NETWORKS: { id: SocialNetwork; label: string }[] = [
  { id: "facebook", label: "Facebook" },
  { id: "mastodon", label: "Mastodon" },
  { id: "x", label: "X" }
];

/** Which networks currently have credentials configured (server-side only). */
export function configuredSocialNetworks(): Set<SocialNetwork> {
  const set = new Set<SocialNetwork>();
  if (process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
    set.add("facebook");
  }
  if (process.env.MASTODON_API_BASE && process.env.MASTODON_ACCESS_TOKEN) {
    set.add("mastodon");
  }
  if (process.env.X_ACCESS_TOKEN) set.add("x");
  return set;
}

/** Auto-post newly published content to every configured network. */
export async function postToSocialMedia(post: SocialPost): Promise<void> {
  const status = composeStatus(post);
  await Promise.allSettled([
    pushMastodon(status),
    pushX(status),
    pushFacebook(status, post.url)
  ]);
}

function composeStatus({ title, url, excerpt }: SocialPost) {
  const summary = excerpt?.trim() ? `${excerpt.trim()}\n\n` : "";
  return `${title}\n\n${summary}${url}`.slice(0, 480);
}

/** Build the announcement text for a calendar event. */
export function composeEventStatus(event: CalendarEvent, note?: string | null) {
  const url = absoluteUrl(eventPath(event));
  const where = event.location?.trim()
    ? `\n${event.location.trim()}`
    : event.locationUrl
      ? "\nOnline event"
      : "";
  const noteLine = note?.trim() ? `\n\n${note.trim()}` : "";
  return [
    `New event: ${event.title}`,
    `${eventTypeLabel(event.type)} · ${eventDateLabel(event.eventDate)} at ${eventTimeLabel(
      event
    )} ${event.timezone}${where}`,
    `${noteLine}\n\n${url}`
  ]
    .join("\n")
    .slice(0, 480);
}

export type EventShareResult = { network: SocialNetwork; ok: boolean };

/**
 * Post an event to the selected networks. Each network only fires when it is
 * both selected AND configured. Best-effort: returns a per-network result so
 * callers can report partial failures, and never throws.
 */
export async function postEventToSocial(
  event: CalendarEvent,
  options: { networks: SocialNetwork[]; note?: string | null }
): Promise<EventShareResult[]> {
  const configured = configuredSocialNetworks();
  const selected = options.networks.filter((network) =>
    configured.has(network)
  );
  if (selected.length === 0) return [];

  const status = composeEventStatus(event, options.note);
  const url = absoluteUrl(eventPath(event));

  return Promise.all(
    selected.map(async (network) => {
      let ok = false;
      if (network === "facebook") ok = await pushFacebook(status, url);
      else if (network === "mastodon") ok = await pushMastodon(status);
      else if (network === "x") ok = await pushX(status);
      return { network, ok };
    })
  );
}

// ---------------------------------------------------------------------------
// Low-level per-network senders. Return true on success, false otherwise.
// ---------------------------------------------------------------------------

/**
 * Mastodon — token-based. Requires MASTODON_API_BASE (e.g.
 * https://iaccessibility.social) and MASTODON_ACCESS_TOKEN with `write:statuses`.
 */
async function pushMastodon(status: string): Promise<boolean> {
  const base = process.env.MASTODON_API_BASE;
  const token = process.env.MASTODON_ACCESS_TOKEN;
  if (!base || !token) return false;

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/v1/statuses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status, visibility: "public" })
    });
    if (!res.ok) {
      console.error("Mastodon post failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Mastodon post error:", error);
    return false;
  }
}

/**
 * X (Twitter) — requires an OAuth 2.0 user-context app and X_ACCESS_TOKEN.
 */
async function pushX(status: string): Promise<boolean> {
  const token = process.env.X_ACCESS_TOKEN;
  if (!token) return false;

  try {
    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: status })
    });
    if (!res.ok) {
      console.error("X post failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("X post error:", error);
    return false;
  }
}

/**
 * Facebook Page — requires FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN
 * (a long-lived Page access token).
 */
async function pushFacebook(message: string, link: string): Promise<boolean> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) return false;

  try {
    const params = new URLSearchParams({
      message,
      link,
      access_token: token
    });
    const res = await fetch(`https://graph.facebook.com/${pageId}/feed`, {
      method: "POST",
      body: params
    });
    if (!res.ok) {
      console.error("Facebook post failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Facebook post error:", error);
    return false;
  }
}
