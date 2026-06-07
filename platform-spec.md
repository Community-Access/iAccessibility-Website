# iAccessibility Platform Specification

Single source of truth for the rebuild. The site is being moved off WordPress.com
(GeneratePress theme) onto a custom Next.js platform that is more than a website: it is
a CMS, a public API, an MCP server, and the backend for the iAccessibility app.

Design parity reference: see `docs/design-tokens.md` (exact blues, type, spacing,
verified WCAG 2.2 AA). Match the current site's look exactly using those tokens.

## Build standards (non-negotiable)

- NO mock implementations. The implementation team builds the ENTIRE thing for real:
  real database, real auth, real storage, real RSS generation, real migration, real API
  and MCP. No stubs, no fake data, no "TODO: wire later" placeholders, no mocked
  endpoints. Every feature in this spec must be fully functional end to end.
- The only intentionally-deferred item is the Facebook/Publicize API key (left blank until
  obtained); the syndication code itself must still be fully built and ready to run once
  the key is set.
- Accessibility (WCAG 2.2 AA) is a build requirement, not a later pass. UI work is routed
  through the accessibility-lead per the project rule.

## Stack

- Next.js (App Router, TypeScript), accessible component baseline (WCAG 2.2 AA).
- Neon Postgres (project `iaccessibility`, region aws-us-east-1, branch main).
- Neon Auth for authentication and sessions.
- Public REST API plus an MCP server, both reading the same data model.
- Object storage: DigitalOcean Spaces (S3-compatible), bucket `techopolis-storage`
  (nyc3), under prefix `iAccessibility/podcast/` (subfolders `episodes/`, `artwork/`,
  `show-notes/`). Podcast/media metadata in Neon; binaries in Spaces. Access via the
  scoped `iaccessibility` Spaces key in `.env.local` (`DO_SPACES_*`). Media is uploaded
  public-read so the RSS feed can serve it.

## Hosting and cutover

- Build and run on a temporary/staging URL first. The site deploys once the first
  implementation milestone is complete.
- `iaccessibility.net` stays on WordPress until we deliberately cut over; DNS flips to the
  new site only when you give the go-ahead. No premature cutover.

## Source migration (WordPress.com Atomic, via WP-CLI over SSH)

Confirmed inventory: 1,543 posts, 279 pages. Pull via wp-cli / WXR / DB as needed.

Migrate:
- Posts (blog, including the iAccessibility Report reviews and iACast show notes) with
  their categories and tags.
- Pages, media library (download and re-host).
- Guidelines (`wp_guideline`).
- Podcasts (`secondline_import`) into the podcast model + RSS.
- Form submissions where worth preserving (`feedback`, `jetpack_form`).
- App directory seed data (`jetpack-portfolio`) mapped into the new directory model.
- Member accounts: migrate ALL existing members/users into the new system as free
  Members (preserve email, username, display name; map admins/moderators accordingly).

No payments anywhere: the Paid Memberships Pro paywall and all `jp_pay_*` / payment
products are DROPPED. Membership is free. No charging, no subscriptions, no premium-gated
content.

Silent member migration (no email blast): import member accounts WITHOUT sending welcome,
verification, or bulk password-reset emails. WordPress password hashes (phpass) are not
reusable by Neon Auth, so migrated accounts are created in a "claim later" state: a user
gains access by signing in with Google/Apple on their existing email (auto-linked by
email), or by initiating a single password reset themselves on first login. We never mass-
email the member list during migration.

Do NOT migrate:
- Forums. All bbPress `forum`/`topic`/`reply` content is removed entirely. No archive,
  no export.

## Content types and taxonomies

Blog posts and the app directory are separate areas with separate taxonomies.

- Blog posts: rich content with their own categories (e.g. the iAccessibility Report and
  others migrated from WordPress) and tags. Directory categories never appear here.
- App directory: a distinct admin area labeled "Directory" / "App Directory" with its own
  category taxonomy, kept out of the blog editor. Directory categories appear only in the
  directory area.

## App directory

- Data for all (third-party) apps via the public iTunes Search / Lookup API. No App Store
  Connect key (own-apps-only API was rejected as too narrow).
- Front-end submission flow: the user MUST be logged in to submit (no guest
  submissions). Logging in associates them as the author of the submission. They submit
  an app via a form; the submission enters a review / pending-approval queue (WordPress
  "pending review" model). An admin or moderator approves before it publishes.
- On submission, notify the admin + moderator team that a directory submission is pending
  review (in-app notification / review queue badge).
- Directory entries carry directory-only categories and record their submitting author.

## Roles and permissions (RBAC)

Three roles. Capabilities are gated server-side and wired to Neon Auth identities. All
directory and blog post submissions go through a review queue before publishing.

- Admin — full access to everything: the admin panel, user management, API key
  management, all content, and reviewing/approving every submission.
- Moderator — everything EXCEPT the admin panel. Cannot manage users or API keys. CAN
  review and approve directory submissions and blog post submissions, and manage content.
- Member — the basic authenticated user. Can submit/upload content (directory entries,
  and authored posts) which enters the review queue. Cannot take moderation or admin
  actions.

Notes:
- Database/schema changes remain restricted to Community Access administrators (CODEOWNERS
  + ruleset, to be enforced once the administrators team exists).
- Maps from the Beyond-the-Gallery role set: its admin -> Admin, moderator -> Moderator,
  subscriber/user -> Member.

## Accessible block editor

- A block-based editor in the spirit of the WordPress block editor, but materially more
  accessible (keyboard-first, screen-reader-friendly, proper focus management and
  announcements).
- Three switchable views on the same document: Rich text, Markdown, and HTML. Round-trip
  fidelity between views is a requirement.
- This editor is the primary authoring surface for blog posts.

## Publishing and syndication

- Publishing a blog post auto-syndicates to Facebook and other networks (Publicize-style),
  matching what Jetpack did.
- Facebook API key obtained later via the iAccessibility Facebook page. LEAVE BLANK for
  now; build the integration so the key drops in later.

## Podcasts (admin/moderator only) and feeds

Podcast management is admin/moderator only, done in the admin panel under a "Podcast"
section. Members CANNOT create or submit podcasts (podcasts are not a front-end
submission like the directory). The platform self-hosts podcasts: audio and artwork live
in DigitalOcean Spaces, metadata in Neon, and we generate the RSS ourselves.

Multiple shows, fully configurable. Everything about a show is editable in the admin:
title, description, language, category, author, owner name/email, explicit flag, type
(episodic/serial), cover art, feed slug, and external-RSS import sources. Adding more
shows and feeds is a first-class, repeatable action (no code changes needed).

Per-show storage layout. When an admin creates a show, the system automatically creates a
dedicated subfolder under the podcast directory keyed by the show slug:
`iAccessibility/podcast/<show-slug>/` with `episodes/`, `artwork/`, and `show-notes/`
under it. Each show's media stays organized in its own folder. (The base
`iAccessibility/podcast/` folder exists; per-show subfolders are created on show
creation, not pre-made.)

Capabilities in the admin Podcast section:
- Create/manage multiple shows; each show has its own stable, self-hosted feed URL and its
  own Spaces subfolder.
- Add episodes manually (upload audio + artwork + show notes; audio/artwork uploaded
  public-read to that show's Spaces subfolder).
- Import episodes from an external RSS feed: paste a feed URL, pull its episodes
  (metadata + enclosure audio + artwork), re-host the audio to our Spaces, and generate
  our own feed from them. When migrating an existing iACast feed, PRESERVE the original
  episode `guid`s and the feed identity so existing Apple Podcasts / Spotify subscribers
  do not lose the show or re-download everything.

### Podcast RSS feed (must validate for Apple Podcasts + Spotify)

Generate RSS 2.0 with the iTunes podcast namespace. The feed and every URL in it
(audio enclosures, images) MUST be HTTPS and publicly reachable. Validate the output
against a podcast feed validator before considering a show done.

- rss root namespaces: `xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"` and
  `xmlns:atom="http://www.w3.org/2005/Atom"`.
- Required channel tags: `title`, `description`, `language` (e.g. en-us),
  `itunes:category` (from Apple's approved list), `itunes:author`,
  `itunes:image href` (square JPEG/PNG, 1400x1400 to 3000x3000, 72dpi, sRGB),
  `itunes:explicit` (required even when false), `itunes:owner` (with `itunes:name` +
  `itunes:email`), `itunes:type` (episodic|serial), plus `link` and an
  `atom:link rel="self" type="application/rss+xml"` to the feed URL.
- Recommended channel tags: `lastBuildDate`, `copyright`.
- Required item tags per episode: `title`, `description`,
  `enclosure` with `url` + `length` (bytes) + `type` (e.g. audio/mpeg),
  `guid` (with `isPermaLink="false"` when not a URL; preserve on import),
  `pubDate` (RFC 2822, e.g. "Mon, 01 Jan 2026 00:00:00 GMT"),
  `itunes:duration` (seconds or hh:mm:ss).
- Recommended item tags: `link`, `itunes:episode`, `itunes:season`, `itunes:episodeType`.

### Podcast player (website)

Use the native HTML5 `<audio controls>` player. Do NOT build a custom player — rely on
the browser's built-in, already-accessible audio controls (which include playback speed
in the native overflow menu). Around the native player, provide accessible page chrome:

- A clear "Download episode" link (explicit, keyboard-accessible) so listeners can save
  the audio.
- Show notes rendered below the player under a real heading ("Show notes").
- Playback speed: provided by the native player controls (no custom speed UI).
- Transcript: when an episode has a transcript, make it viewable on the page (e.g. an
  expandable/disclosure region or linked transcript), under its own heading.
- The whole experience must be fully accessible and keyboard-operable; speed and download
  come from native controls plus the explicit download link.

### Site / blog feeds

- In addition to the per-show podcast feeds, provide a general site RSS feed covering
  blog posts and other site content (reviews, guidelines, news). Standard RSS 2.0 (Atom
  optional). This is separate from the podcast feeds, which follow the iTunes spec above.

## Admin UI

- An accessible admin dashboard ("like WordPress but better") that manages all content:
  blog posts, pages, guidelines, the app directory + its review queue, podcasts, media,
  roles/users, and syndication settings.
- The same backend/admin also serves the iAccessibility app.

## Public API and MCP

- A parallel public REST API exposing published content (posts, pages, guidelines,
  directory, podcasts) for programmatic use and the app.
- An MCP server over the same data so agents and tools can query and (with auth) act on
  the platform.

## Repeatable UI patterns (reuse, do not reinvent)

To keep this fully repeatable across Community Access / Perspective web projects,
standardize on the stack and patterns already proven in `~/developer/Beyond-The-Gallery-Web`
and `~/developer/Start-testing`: Next.js App Router + TypeScript + Tailwind + Radix UI
(shadcn/ui conventions) + Neon + Drizzle ORM. Port these specific patterns:

- Data tables (users, directory entries, posts, etc.): reuse the accessible responsive
  table from `Beyond-The-Gallery-Web/components/admin/users-tab.tsx`. Pattern: real
  `<table>` with `<th scope="col">` and an `aria-label` on desktop; a `role="list"` /
  `role="listitem"` card layout on mobile (md breakpoint); loading state as
  `role="status"` with an aria-label; row action buttons carry name-specific aria-labels
  (e.g. `Edit {name}`, `Delete {name}`); decorative avatars use `alt="" aria-hidden`
  with an initials fallback; sorting via an accessible labeled `<select>`.
- Logged-in user menu: reuse the keyboard-accessible menu from
  `Beyond-The-Gallery-Web/components/layout/header.tsx`. Pattern: trigger button with
  `aria-haspopup="menu"`, `aria-expanded`, and `aria-label="User menu for {name}"`;
  items are `role="menuitem"`; arrow-key navigation; focus moves to the first item on
  open; Escape closes and returns focus to the trigger; click-outside closes. Shows only
  when authenticated; gate items with the RBAC `hasPermission` check.
- shadcn/ui primitives already built there (button, card, input, label, select, modal,
  alert, badge, breadcrumb, textarea) are the baseline component kit.
- Accessible block editor: reuse the TipTap setup from `Start-testing` (TipTap + the
  highlight/link/image/code-block-lowlight/placeholder/task-item extensions, Radix tabs
  for the view switcher) as the basis for the rich text / Markdown / HTML editor.

## Dark mode (OS-synced)

Match the OS. Reuse the exact approach from `Beyond-The-Gallery-Web/app/layout.tsx`: an
inline boot script reads `window.matchMedia('(prefers-color-scheme: dark)')`, toggles the
`dark` class on `document.documentElement`, and subscribes to `change` so it follows the
OS live; Tailwind is configured `darkMode: ["class"]`. No manual toggle required (one can
be added later layered on top). This improves assistive-technology compatibility by
honoring the user's system preference. Both light and dark palettes must pass WCAG AA
using the `docs/design-tokens.md` blues.

## Cookie consent

Add an accessible cookie consent banner now (Google Analytics will be added later).
DECISION (a11y lead): implement as a NON-MODAL banner, not a focus-trapping modal, so the
page stays operable. Requirements: `role="dialog"` + `aria-label="Cookie consent"`,
keyboard-reachable, NO focus trap, Escape = Decline, announced politely on appear, placed
early in the DOM; clear Accept / Decline buttons (decline honored, no analytics until
accept); choice persisted (cookie/localStorage); analytics scripts load only after accept;
once chosen it never reappears, with a footer "Cookie preferences" link to change it. See
docs/accessibility-foundation.md section 5.

## Open items

- None blocking. Spec is ready for the foundation build.
