# Event Broadcast + Blog Comments — Design

Date: 2026-06-08
Status: Approved for planning

## Overview

Four related features for the iAccessibility Next.js rebuild, delivered as one spec:

- **A. Event social sharing** — when an admin creates an event, optionally post it to selected social networks (Facebook, Mastodon, X) with a custom note.
- **B. Events RSS feed** — a separate RSS feed of published events for RSS readers.
- **C. Subscribable iCal feed** — a `webcal://`-subscribable calendar of all published events for Apple Calendar and other calendar apps, covering in-person and virtual events.
- **D. Blog comments** — logged-in users comment on blog posts with full-depth threaded replies; admins, moderators, and the post author are notified (deduped); authors get an inbox of comments needing a response; admins get a moderation list.

Much of the supporting infrastructure already exists and is reused rather than rebuilt.

## Existing infrastructure reused

- `src/lib/social/index.ts` — `postToSocialMedia()` already wires Mastodon (live), X, and Facebook (`postToFacebook` → Graph API `/{pageId}/feed`), each a safe no-op unless its env credentials are set.
- `src/lib/events.ts` — event schema helpers, `getPublishedEvents()`, `getPublishedEventById()`, Google/Outlook URLs, and single-event `eventIcs()`.
- `src/app/my-calendar/events/[id]/ics/route.ts` — per-event `.ics` download.
- `src/lib/email/client.ts` — AWS SES `sendEmail`, `deliver`, and the BTG pattern `deliverToReviewers()` / `reviewerEmails()` (every admin + moderator).
- `src/app/feed.xml/route.ts` — blog RSS feed (pattern to follow for events feed).
- `src/lib/auth/server.ts` — `getCurrentAppUser()`, `canModerate()`, `canAdmin()`.
- `src/lib/content/wordpress.ts` — `getPostBySlug()` reads the `blogPosts` DB table first, falling back to the WordPress API. Returned numeric `id` is source-dependent, so **`slug` is the only stable cross-source post identifier**.

## Decisions (confirmed)

- One combined spec covering all four features.
- Social sharing uses **per-network checkboxes** on the event form (not all-or-nothing).
- Comments **appear immediately** (no pre-moderation queue); soft-delete after the fact.
- Comment threading is **full-depth** in data; UI caps heading levels for screen-reader sanity.
- Reply UI is an **inline disclosure form**, not a modal dialog.
- Author inbox at **`/my-comments`** plus an **`/admin/comments`** moderation list.
- Event RSS and iCal are **separate feeds**, not merged into `/feed.xml`.

---

## Part A — Event social sharing

### Event form (`src/app/admin/events/event-form.tsx`)
Add a "Share to social media" `<fieldset>`:
- One checkbox per network: Facebook, Mastodon, X. The parent server component (`src/app/admin/events/page.tsx`) passes a `configuredNetworks` set (derived from env presence) so unconfigured networks render **disabled** with a hint ("Not connected yet"). Checkboxes default off.
- An optional **custom note** `<textarea>` (`shareNote`), labeled, with a character hint.

### Action (`src/app/admin/events/actions.ts`)
- Extend `eventSchema`/parsing to read `networks` (multi-value) and `shareNote`.
- After a successful insert, if one or more networks are selected, call `postEventToSocial(event, { networks, note })`.
- Posting is best-effort and **must not block or fail** event creation. Collect per-network results and fold them into the success message, e.g. `"Event published. Posted to Facebook. X failed."`.
- Re-sharing an existing event is **out of scope** (YAGNI).

### Composer (`src/lib/social/index.ts`)
- Add `postEventToSocial(event, { networks, note })`.
- New `composeEventStatus(event, note)` builds: `New event: {title} — {date} {time} {timezone}.` + optional `{note}` + canonical event URL. Include `location` for in-person events; rely on the event URL (and `locationUrl`) for virtual events.
- Reuse `postToFacebook/Mastodon/X`, each gated by **both** its env credentials **and** membership in the selected `networks` set. Return a per-network `{ network, ok }[]` so the action can report partial failures.

---

## Part A-support — Event detail page + canonical URL

(Supporting infrastructure shared by features A, B, and C — not a separate feature.)

New page `src/app/my-calendar/events/[id]/page.tsx`:
- Loads the published event via `getPublishedEventById`; `notFound()` otherwise.
- Shows title (`<h1>`), date/time, type, location (in-person) or join link (virtual), description.
- "Add to calendar" controls: Google, Outlook, and `.ics` download (existing `/my-calendar/events/[id]/ics`).
- "Subscribe" control linking to the full iCal feed (Part C).
- This URL (`/my-calendar/events/{id}`) is the canonical link used by social posts, the events RSS feed, and per-event links from the calendar. Add an `eventUrl(event)` helper in `src/lib/events.ts`.

---

## Part B — Events RSS feed

New route `src/app/events/feed.xml/route.ts` (mirrors `src/app/feed.xml/route.ts`):
- Lists published, upcoming events (sorted by date) as RSS `<item>`s: `title`, `description` (date/time, location or "Virtual", event description), `pubDate` from `createdAt`, `guid`/`link` = `eventUrl(event)`.
- Includes channel metadata + `<atom:link rel="self">` and `Cache-Control` headers.
- Discoverable via `<link rel="alternate" type="application/rss+xml" title="iAccessibility Events">` in the events page head and a visible "Events RSS" link on `/my-calendar`.

---

## Part C — Subscribable iCal feed

New route `src/app/events/calendar.ics/route.ts`:
- Refactor `eventIcs()` in `src/lib/events.ts` to share a VEVENT builder; add `eventsIcsFeed(events)` that wraps all published upcoming events in one `VCALENDAR` with `X-WR-CALNAME:iAccessibility Events` and a `REFRESH-INTERVAL`/`X-PUBLISHED-TTL`.
- Each VEVENT: `UID`, `DTSTART`/`DTEND` with `TZID`, `SUMMARY`, `DESCRIPTION`, `LOCATION` (in-person), `URL` (virtual / `locationUrl`).
- The events page offers **"Subscribe in Apple Calendar"** via a `webcal://…/events/calendar.ics` link plus a copy-the-feed-URL control, so subscribing apps auto-refresh.
- `Content-Type: text/calendar; charset=utf-8`.

---

## Part D — Blog comments

### Schema (`src/db/schema.ts`) — new `comments` table
- `id` serial PK
- `postSlug` text not null — join key, stable across DB- and WP-sourced posts
- `parentId` integer null, self-reference (`onDelete: cascade`) — enables full-depth threads
- `authorId` integer → `users.id` (`onDelete: set null`) — commenter must be logged in
- `authorName` text — snapshot of display name for resilience if the user is later removed
- `body` text not null
- `status` enum `comment_status` (`visible` | `deleted`) default `visible` — soft-delete preserves thread structure
- `createdAt`, `updatedAt` timestamps
- Indexes: `(postSlug, createdAt)`, `parentId`
- One Drizzle migration adds the table + enum.

### Data access (`src/lib/comments.ts`)
- `getCommentsForPost(postSlug)` — all non-purged comments for a post, returned as a tree (top-level + nested children) sorted by `createdAt`.
- `getCommentsForAuthor(userId)` — comments on posts authored by `userId`, flagged `needsResponse` when the post author has not replied in that thread.
- Shared types and a `buildCommentTree()` helper.

### Server actions (`src/app/blog/[slug]/comment-actions.ts`)
- `addComment(prevState, formData)` — requires `getCurrentAppUser()`; zod validation (body non-empty, max length; optional integer `parentId`; required `postSlug`); insert with `authorId` + `authorName` snapshot; fire `notifyOnNewComment(...)`; `revalidatePath('/blog/[slug]')`. Returns `useActionState`-style state.
- `deleteComment(formData)` — allowed for the comment owner **or** `canModerate(user.role)`; soft-delete (`status = 'deleted'`, `body` cleared); revalidate. Replies remain, parent renders as "Comment removed."
- No edit action (YAGNI).

### Notifications (`src/lib/email/client.ts`)
- Add `commentNotificationEmail({ postTitle, commenterName, body, commentUrl })` (HTML + text, brand palette).
- Add `notifyOnNewComment({ postSlug, postTitle, commenterEmail, commenterName, body, commentUrl })`:
  - Recipients = `reviewerEmails()` (all admins + moderators) **∪** the post author's email (resolve `blogPosts` by `postSlug` → `authorId` → `users.email`; may be null for WP-only posts).
  - **Dedupe by a `Set`** so an admin/moderator who is also the author gets one email.
  - **Exclude** the commenter's own email.
  - Best-effort delivery (`Promise.allSettled`).

### Author inbox (`src/app/my-comments/page.tsx`)
- Auth-gated (any logged-in user). Lists comments on the current user's posts via `getCommentsForAuthor`.
- Comments **without an author reply** are grouped/flagged "Needs response" first; each links to the comment anchor on its post.
- Linked from the auth menu when signed in.

### Admin moderation (`src/app/admin/comments/page.tsx`)
- New admin section "Comments" (added to `src/app/admin/layout.tsx` sections, `adminOnly` consistent with other content sections; moderators included since they can moderate).
- Uses the Start-testing `ItemTable` + actions-list pattern: post, commenter, snippet, time, Delete action (calls `deleteComment`).

### Comments UI on the post page (`src/app/blog/[slug]/page.tsx`)
A `<section aria-labelledby="comments-heading">` rendered below the article:
- `<h2 id="comments-heading">Comments</h2>`.
- Comment list as nested `<ul>`/`<li>`. Each comment is an `<article>` with a heading: top-level `<h3>` (author name + relative time), replies `<h4>`. **Heading levels cap at `<h4>`**; depth beyond two levels is conveyed by list nesting + indentation, not `<h5>`/`<h6>`, to keep VoiceOver heading navigation usable.
- Each comment shows body, author, timestamp, and a **Reply** button toggling an **inline reply form** (disclosure): focus moves into the textarea on open and returns to the Reply button on cancel.
- A top-level "Add a comment" form for logged-in users (labeled textarea, submit, inline validation errors). Logged-out users see a "Log in to comment" link instead.
- A polite `aria-live` region announces "Comment posted"; focus moves to the newly added comment.
- Delete control shown on a comment for its owner or a moderator.

---

## Cross-cutting

### Accessibility
All new and changed UI — event form share fieldset, event detail page, events page subscribe/RSS controls, comments section + inline forms, `/my-comments`, `/admin/comments` — is reviewed by `accessibility-lead` (and relevant specialists: forms, keyboard, live-region, alt-text/headings) **before** the code is written, per the repo's enforced hooks. Non-negotiables: one `<h1>` per page, no skipped heading levels (within the h4 cap rule), full keyboard operability, managed focus on reply/submit/delete, live-region announcements, labeled inputs with accessible error handling, and 4.5:1 / 3:1 contrast using the existing brand palette.

### Testing
Unit tests (no live network/SES) for:
- `notifyOnNewComment` recipient dedup (admin-author counted once; commenter excluded).
- Comment soft-delete preserves child replies; `buildCommentTree` ordering/nesting.
- Events RSS and iCal output are well-formed (valid XML; required VCALENDAR/VEVENT fields).
- `composeEventStatus` includes title/date/note and respects the selected-networks gate.
- Slug → author resolution (DB post present vs WP-only → null author).
Plus `tsc` typecheck and a production build.

### Migration & env
- One Drizzle migration: `comments` table + `comment_status` enum.
- Facebook posting requires `FACEBOOK_PAGE_ID` + `FACEBOOK_PAGE_ACCESS_TOKEN` in the deploy environment (already consumed by existing `postToFacebook`). No code change needed to "turn on" Facebook beyond the share UI + setting these vars.

### Out of scope (YAGNI)
- Editing comments; comment reactions/likes.
- Re-sharing an already-created event.
- Pre-publish comment moderation queue.
- Merging events into the blog `/feed.xml`.

## Affected / new files (summary)
- New: `src/app/my-calendar/events/[id]/page.tsx`, `src/app/events/feed.xml/route.ts`, `src/app/events/calendar.ics/route.ts`, `src/lib/comments.ts`, `src/app/blog/[slug]/comment-actions.ts`, `src/app/blog/[slug]/comments.tsx` (client UI), `src/app/my-comments/page.tsx`, `src/app/admin/comments/page.tsx`, Drizzle migration.
- Changed: `src/lib/social/index.ts`, `src/app/admin/events/actions.ts`, `src/app/admin/events/event-form.tsx`, `src/app/admin/events/page.tsx`, `src/lib/events.ts` (`eventUrl`, `eventsIcsFeed`), `src/lib/email/client.ts`, `src/db/schema.ts`, `src/app/admin/layout.tsx`, `src/app/blog/[slug]/page.tsx`, `src/app/my-calendar/page.tsx`, auth menu (link to `/my-comments`).
