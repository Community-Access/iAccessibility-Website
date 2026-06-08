# iAccessibility Agent Notes

Last updated: 2026-06-07

## Session 2026-06-07 (PM): admin rebuild, emails, directory

Big build session driven by Taylor's VoiceOver testing. Detailed per-item status
lives in `ADMIN_FEEDBACK.md` (source of truth). Guiding preference: mirror the
**Start-testing** project and strip WordPress-style verbosity. Every UI change
was accessibility-lead reviewed; every commit is `tsc` + `next build` verified
and pushed to `main` (DO App Platform auto-deploys). Note: the admin is
auth-gated and could not be self-tested — Taylor tests after each deploy.

Shipped this session (commit → area):
- Ported Start-testing UI primitives, re-themed to the light tokens: `badge`,
  `empty-state`, `error-alert`, `modal`, `tabs`, `breadcrumb`,
  `toast`/`toaster` + `use-toast` hook; `item-table` upgraded to parity (skip
  links, loading, srOnly/width). Darkened `--border`/`--input` 0 0% 80% → 46%.
- Admin chrome: removed "Signed in as…" bar, "Social links" aria-label, helper
  text, WhatsApp link; renames ("Recent users"→"All users", "Review
  queue"→"Pending review"); dashboard dl breakdown + Quick actions grid.
- Editor (custom block editor, NOT BlockNote): autofocus Title; Title Enter →
  body block (fixed accidental form submit); beforeunload unsaved warning;
  per-block controls collapsed behind one `<details>` "Block actions"; Cmd/Ctrl+A
  two-step select-all-blocks + Delete-to-clear + Cmd/Ctrl+Z undo; live "Show
  preview" pane via `blocksToHtml`; command-palette trigger cleaned up.
- Posts: Unpublish (→draft) + Delete (hard, confirm Modal) row actions.
- Users: client search + pagination + `/admin/users/[id]` profile pages.
- New admin sections: `/admin/podcasts` (searchable episode catalogue),
  `/admin/media` (media library — list, edit alt, copy URL, delete).
- Submit menu: apps + blog post (/report) + podcast (/iacast-network).
- Email: `notifyAdminSubmission`/`notifyAdminNewUser` now fan out to EVERY
  moderator + admin user (BTG pattern, deduped, REVIEW_NOTIFICATION_EMAIL
  fallback); submitter "received" email already wired in all 3 submission
  routes. SES env IS configured in the DO app, so email sends end-to-end.

Known gaps / deferred: audio/podcast submissions have no review/decision flow or
decision email (intake + confirmation only); post "trash" is hard delete (no
restorable soft-trash — needs a migration); live preview is below the editor,
not a side pane. Accessibility Nutrition Labels: only available via the App Store
Connect API for your OWN apps (auth'd) — NOT fetchable for third-party directory
apps; the public iTunes API doesn't expose them.

App Directory redesigned: categories radio group ("Filter by category", counts
in the accessible name) + a "Filter" button opening the ported `Modal` (staged
search/platform → Apply, the Start-testing filter-modal pattern) + the homepage
card grid as `<ul>/<li>` with app-name links (new tab); default = 10 most recent
(id desc), category click loads that category with a polite live announcement;
focus moves to the results `<h2>` on category select but stays in search during
typing. Dropped the old platform-checkbox column + URL-param pagination.

Public podcasts DISABLED (2026-06-07): media-host enclosure URLs return
AccessDenied (won't play) pending migration to Michael's Pinecast feed. Gated
behind `src/lib/flags.ts` → `PODCASTS_PUBLIC_ENABLED = false`; hides the homepage
"Latest iACast Episodes" section and the `/iacast-network` PodcastBrowser (shows
a "temporarily unavailable" note). Audio submission form + admin /admin/podcasts
are unaffected. Flip the flag back to `true` once the Pinecast feed is wired.

## Admin feedback backlog (2026-06-07)

Taylor ran a VoiceOver test pass over the admin + editor. Full backlog with
status is in `ADMIN_FEEDBACK.md` (source of truth). Guiding preference: mirror
the **Start-testing** admin and strip WordPress-style verbosity.

Batch 1 (quick a11y + copy fixes) applied, accessibility-lead reviewed:
- Footer: removed WhatsApp link; removed `aria-label="Social links"` (kept ul/li).
- AdminNav: removed the "Signed in as <name> / <role>" block; component no longer
  takes `name`/`role` props (also updated the layout call site).
- Users page: removed the helper sentence; "Recent users" → "All users".
- Dashboard: "Review queue" → "Pending review" (also nav label, review page h1,
  review metadata); pluralized the user-counts detail; removed the duplicate
  "Manage users" button from Content management.
- Editor: "Featured image" legend now wraps an `<h2>` (heading-nav + fieldset
  group preserved); command-palette trigger is a plain button — dropped
  aria-haspopup + aria-controls, kept aria-expanded, added
  aria-keyshortcuts="Meta+K Control+K", visible aria-hidden ⌘K kbd, sr-only span
  so the name reads "Command palette, Command K".

NOTE: the /admin/posts/new editor is a CUSTOM hand-rolled block editor (custom
`blocks` array, custom block menus + command palette), NOT BlockNote — relevant
for the remaining editor-behavior items (select-all+delete, blank-block on Enter,
block-options-on-blur, command-palette "enter the post body" bug, drafts).

Still open (bigger): Users-table rework, dashboard rebuild, editor behavior,
media library, podcasts admin, post trash/unpublish, preview pane, profiles.
Build passes after batch 1.

## Shared accessible UI primitives ported from Start-testing (2026-06-07)

Brought over the proven-accessible reusable `ui/` primitives from
`/Users/taylorarndt/developer/Start-testing`, re-themed from that app's dark
palette to the iAccessibility light design tokens. The accessibility-lead
reviewed the dark→light re-theme first (main risk = contrast on translucent
fills). New/updated files under `src/components/ui/`:

- `badge.tsx` — generic `Badge` + config-driven `StatusBadge`. Light tints with
  dark saturated text (≥4.5:1); a text label is always required (no color-only).
  Replaces Start-testing's product-coupled badge (bugs/features `item-config`).
- `empty-state.tsx` — `EmptyState` (decorative icon `aria-hidden`, configurable
  heading level) + `EmptyStateInline`.
- `error-alert.tsx` — `ErrorAlert` (role=alert, assertive, focusable/autofocus),
  `FieldError` (role=alert, for `aria-describedby`), `SuccessAlert` (role=status,
  polite). Dark translucent fills replaced with `#fdeaea/#8a1414`,
  `#e7f5ec/#1a6b38` solid tints.
- `modal.tsx` — native `<dialog>` + `showModal()`, focus return (guards removed
  trigger), Tab trap, Escape via `cancel`, body scroll lock, padded close button.
- `tabs.tsx` — Radix tabs wrapper (`@radix-ui/react-tabs`, already a dep), active
  state differs by underline+weight+color (not hue alone).
- `breadcrumb.tsx` — `nav[aria-label="Breadcrumb"] > ol`, current page is plain
  `aria-current` text, route labels re-mapped to this site's routes.
- `item-table.tsx` — upgraded to source parity: skip-to-top/bottom links (targets
  have `tabindex=-1`), loading state (role=status, `motion-safe:animate-spin`),
  `srOnly` + `width` column options. Kept as a Server Component; load-bearing
  gridline borders stay `#767676` (token `--border` #cccccc is too light).

Toast (ported 2026-06-07): added `@radix-ui/react-toast` dependency, plus
`src/hooks/use-toast.tsx`, `src/components/ui/toast.tsx`,
`src/components/ui/toaster.tsx`, and mounted `<Toaster>` persistently inside the
client `Providers` (so the live region exists before any message — WCAG 4.1.3).
- Hook is CONTROLLED: Radix drives the auto-dismiss timer (pauses on hover/focus,
  WCAG 2.2.1) — no blind `setTimeout`. `open` toggles via `onOpenChange`.
- error → `type="foreground"` (assertive) + `duration={Infinity}` (persistent,
  never auto-dismiss an actionable message); success/warning/default →
  `type="background"` (polite) + 5s.
- Variant fills match the alert tints; each variant has a leading icon
  (aria-hidden) as a non-color signal (WCAG 1.4.1).

Global token change (2026-06-07): `--border` and `--input` darkened from
0 0% 80% (#cccccc, ~1.6:1) to 0 0% 46% (#767676) so load-bearing borders/inputs
clear WCAG 1.4.11 (3:1) on both #fff and the #f5f5f5 page background. The
`* { @apply border-border }` base rule only sets border-color, so this changes
only borders that already have width — no new outlines. Audited all
`border-border`/`border-input` usages: all load-bearing (cards, inputs, menus,
separators), no faint-divider regressions.

`npx tsc --noEmit` passes; existing `ItemTable` callers (admin posts/review/users)
are unaffected (API is backward-compatible).

## Current baseline

- Treat the current repository state as the source of truth. Do not restore the old
  deleted Next.js source tree from git history; another AI's prior work is considered
  untrusted.
- Current tracked files are the root project documents, including `platform-spec.md`.
- This rebuild starts fresh from the current bare repo, the live WordPress site, and the
  named reference projects:
  - `/Users/taylorarndt/developer/Beyond-The-Gallery-Web`
  - `/Users/taylorarndt/developer/Start-testing`

## Live WordPress inventory found so far

- Public site: `https://iaccessibility.net`
- WordPress.com public API site ID: `103675907`
- Public REST API is reachable at `https://iaccessibility.net/wp-json/`.
- Public REST types include posts, pages, media, guidelines (`wp_guideline`), Jetpack
  portfolio (`jetpack-portfolio`), Jetpack forms, feedback, BuddyPress, GeneratePress
  elements/fonts, and payment-related Jetpack types.
- Public feedback and Jetpack form endpoints return `401`, so private form responses need
  SSH/WP-CLI or authenticated WordPress API access.
- Forums are intentionally excluded from migration and product scope.

## SSH status

- Local key exists at `/Users/taylorarndt/.ssh/iaccessibility_wordpress_ed25519`.
- Known hosts include `ssh.wp.com` and `sftp.wp.com`.
- SSH is working with:
  `ssh -i /Users/taylorarndt/.ssh/iaccessibility_wordpress_ed25519 tlaurenb10-lvcmk.wordpress.com@ssh.wp.com`
- Confirmed via WP-CLI: `wp option get home` returns `https://iaccessibility.net`.

## WordPress private export

- Local private export directory: `migration/wordpress-export/`.
- This directory is intentionally ignored by git because it contains member/form/private
  migration data.
- Exported from WordPress.com with SSH/WP-CLI on 2026-06-07:
  - `wp-posts.json`: 1,543 posts.
  - `wp-pages.json`: 279 pages.
  - `wp-media.json`: 511 attachments.
  - `wp-users.json`: 484 users.
  - `wp-jetpack-forms-feedback.json`: 69 feedback rows.
  - `wp-legacy-unregistered-posts.json`: 467 legacy/plugin rows, including
    `captivate_podcast` and `vfb_entry`.
  - `gravityforms.sql`: Gravity Forms definitions, entries, entry meta, notes, views,
    draft submissions, and addon feeds. API-key and payment-callback/payment-transaction
    tables were intentionally not exported.
  - `taxonomy.sql` and `postmeta-comments.sql`: taxonomy, relationship, postmeta, and
    comment data needed for migration analysis.
- `wp export` failed on the host with a temporary-site-unavailable error, so the export
  uses targeted WP-CLI JSON and SQL instead of WXR.

## Navigation baseline

- WordPress menu: `Navigation` with 10 exported menu items:
  Home, Report, iACast, App Directory, Forums, Community, Events, About, Log In, Sign Up.
- Product scope says forums are not migrated or exposed. Current app navigation removes
  Forums and keeps the remaining order:
  Home, Report, iACast, App Directory, Community, Events, About, Log In, Sign Up.

## Gravity Forms replacement targets

- Active forms discovered:
  - 4, "Post to the App Directory": app name/version, platform, category, description,
    free/paid, price, tested devices, accessibility rating, accessibility comments,
    screen-reader performance, button labeling, usability, low-vision comments, other
    comments, App Store link, developer website.
  - 8, "Submit To The Report": report title, report content, optional post image.
  - 9, "Submit Audio Content": episode title, name, content description, media file.
  - 10, "iA Spotlight": listing fields plus payment-oriented Square fields.
- Payment-heavy legacy Gravity Forms should not drive the free-membership rebuild.

## Neon status

- Neon project: `iaccessibility` (`frosty-bar-79561958`).
- Read-only MCP checks only; no database changes have been made.
- Public schema already contains users, blog posts/categories/tags, pages, guidelines,
  directory entries/categories, media, podcast shows/episodes, and join tables.
- Row counts on 2026-06-07: `users` has 2 rows; content/media/podcast/directory tables
  are empty.
- Neon Auth tables exist under `neon_auth`.
- PostgreSQL version: 17.10.
- Drizzle has 3 migration records.
- Public indexes and constraints exist for the scaffold tables, including slug uniqueness,
  status indexes, and legacy WordPress ID uniqueness where modeled.
- Database quality findings before any schema change:
  - The existing schema is a usable scaffold, but it is not sufficient for a faithful
    WordPress migration.
  - No generic form definitions/submissions tables exist for Gravity Forms, Jetpack
    feedback, VFB, or WPForms conversion.
  - `directory_entries` lacks the WordPress app-directory submission fields: platform,
    app version, price/free-paid, tested devices, accessibility rating, and detailed
    accessibility review answers.
  - `users.auth_user_id` is required, which conflicts with the spec's "claim later"
    migration unless placeholder auth IDs are used or a separate claim-state model is
    added.
  - `pages` lacks WordPress hierarchy/menu metadata such as parent, menu order, author,
    and published date.
  - `media` lacks legacy media ID, title/caption/description/source URL, dimensions, and
    rehost status fields.
  - No notification/review-queue event table exists for admin/moderator pending-review
    alerts.
  - No schema changes have been made; ask Michael/Taylor before changing Neon.

## Email and secrets

- SES pattern comes from Beyond The Gallery and Start-testing.
- Use env vars only; never commit real credentials.
- Required SES env keys: `AWS_REGION`, `AWS_ACCESS_KEY_ID`,
  `AWS_SECRET_ACCESS_KEY`, `SES_FROM_EMAIL`.
- Existing `.env.local` is untracked and already holds project secrets for local testing.

## Build direction

- Fresh Next.js App Router scaffold.
- Public pages can use live WordPress public REST data as a real temporary bridge until
  SSH export/import is available.
- Protected submissions and review queue should write to the existing Neon tables, but
  only when a signed-in user/admin performs an action.
- No schema changes without asking Michael/Taylor first.
- Use the in-app browser for local testing once the dev server is running.

## Implementation pass started 2026-06-07

- Recreated the app foundation from the current bare repo: Next.js App Router,
  TypeScript, Tailwind, Drizzle schema mapping, Neon Auth route/middleware, SES utility,
  DigitalOcean Spaces upload utility, and GeneratePress-inspired layout.
- Added `docs/design-tokens.md` from the live site because `platform-spec.md` references
  it but the current repo did not contain it.
- Public content pages read Neon first and fall back to live WordPress REST while Neon
  content tables are empty.
- Added public routes: `/`, `/blog`, `/blog/[slug]`, `/report`, `/iacast-network`,
  `/app-directory`, `/app-directory/submit`, `/plus`, `/my-calendar`, `/about`.
- Forums are not exposed in navigation or as a public placeholder route.
- Added authenticated submission API routes:
  - `/api/submissions/directory` writes pending `directory_entries` using current schema.
    WordPress-only form fields are folded into the description until schema expansion is
    approved.
  - `/api/submissions/report` writes pending `blog_posts` and can upload an optional
    image to Spaces.
  - `/api/submissions/audio` uploads audio to Spaces and notifies the review team by SES.
- Added `/admin` review queue for pending report posts and directory entries, gated to
  admin/moderator roles.
- Re-read `platform-spec.md` after user reminder. Header now uses the live WordPress
  GeneratePress blues (`#0066bf`, `#1e73be`, hover/active `#035a9e`) and a custom
  Neon-backed logged-in user menu modeled on Beyond The Gallery's keyboard-accessible
  header pattern instead of the generic Neon `UserButton`.
- WordPress parity patch on 2026-06-07 removed Forums from navigation and the homepage,
  removed the `/forums` placeholder page, disabled automatic dark-mode activation, set
  body type to the live WordPress 17px / 1.5 rhythm, and kept the homepage copy from
  WordPress except for the removed forum offering.
- Follow-up accessibility fixes added route-change focus/announcements, reduced-motion
  CSS, stronger auth-menu focus rings, a focusable skip-link target, no broken closed
  `aria-controls`, no fake dialog semantics for the cookie banner, no duplicate logo
  accessible name, titled podcast download links, and new-tab warnings for footer links.

## Accessibility requirements

- Accessibility agents are mandatory for web UI completion.
- Accessibility lead has been invoked.
- Relevant specialists must be run before claiming review complete: ARIA, keyboard,
  contrast, forms, live-region, alt-text/headings, tables, links, and modal/dialog if
  any overlay/banner behavior is in scope.

## Session log — 2026-06-07 (Claude, continued from Codex)

### Deployment (live)
- GitHub `Community-Access/iAccessibility-Website` @ `main`; pushes auto-deploy.
- DigitalOcean App Platform app `iaccessibility` id `f2edf3c3-f0e2-409e-a641-b6480e3edf2e`,
  live `https://iaccessibility-9h5gv.ondigitalocean.app`. Source switched to the GitHub
  integration with `deploy_on_push: true`. AWS SES env added to the DO spec (email works in
  prod). `doctl` authed ("My Team"). DO spec edits are FULL-spec replace via `doctl apps update`.

### Hard rule
- Do NOT modify the live WordPress site / WP-CLI (user directive, repeated). It is read-only
  reference; all "menu/content" changes apply to the Next.js rebuild.

### Design / layout / public site
- Removed ALL dark mode. Light-only, live WP blues; text/links use AA-safe `#0f6cba`
  (live `#1e73be` failed 4.5:1). Header `#0066bf`, hover `#035a9e`, footer `#55555e`.
- Full-bleed header; content `max-w-7xl`. Removed the deprecated "Ask iAccessibility" chatbot.
- Footer: dark gray, centered socials. FIXED a real bug — footer `<a>` inherited the global
  blue (unreadable on gray); social links now `text-white`. Footer links: About, Privacy
  Policy (`/privacy`), RSS feed (`/feed.xml`).
- Listings (`/blog`, `/report`, homepage "Latest Posts") = BTG-style card grid (`sm:2 / lg:3`)
  with `<h3>` per post, a featured image (logo fallback), and a "By {author} · {date}" byline.
- Report page: removed the right sidebar; full-width; "Submit to the Report" link at top
  anchors to the full-width submission form. Renamed listing to "Latest Posts" (spans all
  categories incl. iACast).
- Pagination component (`src/components/layout/pagination.tsx`), used on `/blog` and `/report`.
- RSS at `/feed.xml` (RSS 2.0, latest 50 posts) + `<link rel=alternate>` discovery.
- Privacy policy page at `/privacy`.

### Email (AWS SES, light-only, AA) — `src/lib/email/client.ts`
- Templates for every event: welcome, admin new-user, per-submission confirmation + admin
  notification (directory/report/audio), approved/rejected. Wired into signup, the three
  submission routes, and admin approve/reject. REVIEW_NOTIFICATION_EMAIL=taylor@techopolisonline.com.

### Admin panel (RBAC) — `src/app/admin/*`
- Shell guards `canModerate`; role-filtered nav. Moderators: Dashboard + Review queue.
  Admins also: Posts. `/admin/posts*` additionally guard `canAdmin` server-side.
- Tables use a light-themed port of Start-testing's accessible `ItemTable`
  (`src/components/ui/item-table.tsx`): caption+count, scope col/row, keyboard-scrollable region,
  skip-to-top/bottom links.
- Custom accessible block editor at `/admin/posts/new` (admin-only): title, featured image w/
  required alt, block body, draft/publish (publish announces on social). Images upload to Spaces
  via `/api/admin/media/upload`. Field errors focus the exact invalid control.
- Auto-publish: admin/mod report submissions skip review and post to social
  (`src/lib/social`: Mastodon wired; X/Facebook gated on env).

### Database (Neon project `frosty-bar-79561958`)
- Fixed `users` schema drift (removed phantom `username`; added real `avatar_url`).
- Added `blog_posts` columns: `author_name`, `featured_image_url`, `featured_image_alt`.
- `scripts/migrate-wp.mjs --posts-only`: imported all 1,543 posts (1,542 published) with author
  names. `scripts/migrate-media.mjs`: imported 511 media rows and set featured images on 705
  posts from WP `_thumbnail_id`. Idempotent upserts. Blog now serves from Neon, not WP REST.
- Roles: taylor@techopolis.app (id 5) and techopolis@techopolis.online (id 4) are both `admin`
  in `public.users`. BUT there is NO Neon Auth account for those emails — those rows were SEEDED
  with placeholder auth ids. The only real Neon Auth account is an e2e test user. So "Log In" /
  "Forgot Password" fail (nothing to authenticate). The admins must SIGN UP with their email to
  create a credential account + set a password; `getCurrentAppUser` matches by email and grants
  admin. Neon Auth (Better Auth) stores credentials in `neon_auth.*` (account/user/session/
  verification) — do NOT hand-write passwords there.
- `getCurrentAppUser` now CLAIMS a pre-existing email-matched record by updating its
  `auth_user_id` to the current auth identity on first sign-in (links seeded admin rows to the
  real auth account).

### Open accessibility investigation
- User reported an "unlabeled button on one of the controls." All buttons in our own editor code
  now have visible text; the deployed /auth/sign-in a11y tree was previously clean. If this recurs,
  capture the exact page/control because it may come from a third-party Neon Auth widget.

### Session log — 2026-06-07 (Claude, App Directory redesign + migration audit)

#### App Directory redesign (DONE, verified rendering on local dev :3001, tsc clean)
- Drove the redesign through `accessibility-agents:accessibility-lead` FIRST (per project hook).
  It returned a full WCAG 2.2 AA spec; implementation follows it.
- FIXED a real bug: `getDirectoryEntries(limit = 24)` capped the page at 24 of 81 approved apps —
  57 apps were invisible. Removed the cap; the page now shows ALL approved apps with client-side
  search + filter + pagination (12/page).
- Data layer (`src/lib/content/wordpress.ts`): `getDirectoryEntries()` now joins
  `directory_entry_categories` and attaches `platforms[]` + `categories[]` to each entry by
  splitting the migrated "Platform: Category" names (`splitDirectoryCategoryName`). Added
  `deriveDirectoryFacets()` (distinct platforms/categories across approved entries) and the
  `DirectoryFacets` type. `KNOWN_DIRECTORY_PLATFORMS` set gates valid platform prefixes.
- New client component `src/components/directory/directory-browser.tsx`: native `<search>` + GET
  form, platform checkboxes in a `<fieldset>`, a grouped category `<select>` (replaces the
  unusable flat wall of 231 categories), removable active-filter chips + "Clear all", `<ul>/<li>`
  card grid with `<article aria-labelledby>` + `<h4>` titles, accessible `<nav>` pagination,
  polite `role="status"` live region announcing result counts (debounced 400ms), focus moved to
  the results heading on page change, and a skip-to-results link. URL stays in sync
  (`?q=&platform=&category=&page=`) for shareable/back-button state.
- `src/app/app-directory/page.tsx` is now a server shell: H1 hero + top Submit CTA, the
  `<DirectoryBrowser>` under an sr-only "Browse apps" H2, and a bottom "Submit an app" section
  with a repeated CTA. `metadata.title` set.
- Colleague (blind tester) feedback addressed: (1) submit CTA now repeated at the BOTTOM after the
  list; (2) "unsure if logos are images" — app icons are correctly decorative `alt=""` (name is in
  the adjacent H4), the no-icon fallback tile is `aria-hidden`, and the ambiguous platform text
  list became real filter checkboxes; (3) pagination now actually exists on this page.
- Link text: every card's "App Store"/"Developer website" link appends an sr-only
  " for {appName}" so the 81 repeated links are unambiguous (2.4.4). Card links now underlined.
- `src/app/page.tsx` homepage updated to `getDirectoryEntries().then(r => r.slice(0,5))` since the
  limit arg was removed.

#### Migration audit — what is and is NOT migrated (Neon `frosty-bar-79561958`, read-only checks)
- DONE: posts 1,543; blog categories 244 + 2,278 post-category links; tags 830; media 511;
  directory entries 81 (all approved) with 231 categories + 248 entry-category links.
- Directory icons: only 32 of 81 entries have `icon_url` (the other 49 use the letter-tile
  fallback). Fetching/storing the missing icons is still pending.
- NOT migrated yet (real gaps; tables already exist so NO schema change needed to import):
  - iACast PODCASTS: 300 `captivate_podcast` episodes (all `publish`, clean slugs) with audio
    enclosures at `iaccessibility.net/iacast/*.mp3` (size + duration in the `enclosure` postmeta).
    `podcast_shows`/`podcast_episodes` are EMPTY — the iACast nav page has no data. Big win, ready
    to script.
  - PAGES: 279 in `wp-pages.json`, `pages` table is EMPTY.
  - EVENTS: my_calendar plugin data (only 2 `mc-events` in the small export file; the calendar
    table was not fully exported).
- MEDIA IMPORT ISSUES (confirmed):
  1. ZERO rehosting — all 511 media URLs and all 705 featured images still point at live
     `iaccessibility.net/wp-content`. The rebuild is still fully dependent on the WP site.
  2. `media.alt` was set from the attachment `post_title` (filenames like IMG_1234), NOT the real
     `_wp_attachment_image_alt`. The good alt is already parsed in `migrate-media.mjs` and used for
     featured images, but the `media` table itself gets junk alt. Quick re-run fix, no schema change.
  3. 9 posts embed inline `wp-content` body images that are neither rehosted nor alt-checked.

### Session log — 2026-06-07 (Claude, migration completion pass)

User directive: "get everything migrated from WordPress — all media, all posts; directory
app icons fetched from the iTunes API; remove the sidebar (explicitly pulled)." Also a standing
instruction: UPDATE THIS FILE every time something changes, before moving to the next task.

DONE this session:
- SIDEBAR REMOVED. Deleted `src/components/layout/sidebar.tsx`; collapsed the homepage
  (`src/app/page.tsx`) two-column grid to a single full-width column. Routed through
  accessibility-lead first (project hook) — returned GO; verified no dangling refs and that
  `ContentList` still emits the "Latest Posts" H2 so the heading outline stays gap-free.
- PAGES migrated. Ran `migrate-wp.mjs` (no `--posts-only`) → 279 pages imported into the
  previously-empty `pages` table. Idempotent on `legacy_wp_post_id`.
- DIRECTORY ICONS backfilled via the iTunes API. New script
  `scripts/backfill-directory-icons.mjs` (idempotent, only fills `icon_url IS NULL`):
  prefer `itunes_app_id` lookup, else parse the id out of `app_store_url`, else search by
  name; stores 512px artwork. 49/49 resolved; reverted 1 wrong name-search match
  (entry 80 "The End of an Era…", a non-app blog-style entry) back to the letter-tile.
  Final directory icon coverage: **80/81** (entry 80 is genuinely not an app).

iACast PODCAST findings (important — the prior note was wrong about audio location):
- The 300 `captivate_podcast` posts DO NOT carry audio in their own `enclosure` meta. They
  store Captivate metadata: `cfm_show_id`, `cfm_episode_id`, `cfm_episode_media_url`
  (audio on `podcasts.captivate.fm`), `cfm_episode_artwork`, itunes summary/subtitle/number/
  season/type/explicit, and a serialized `cfm_episode_transcript`.
- Those 300 episodes span **6 distinct Captivate shows** (by `cfm_show_id`): 229 / 33 / 14 /
  10 / 8 / 6 episodes. The export has NO show TITLES, only show UUIDs — naming the 6 shows is
  a decision for Taylor/Michael (flagship 229 looks like the main iACast; 33 = "SafetyCast";
  the 14 + 6 look like "Spanish with Carla" seasons; 10 and 8 unclear).
- SEPARATELY, 486 classic self-hosted `/iacast/*.mp3` enclosures live on regular wp-posts
  (titles like "#iACast 9 - Apple Gaming on a TV"), each with byte size + duration in the
  `enclosure` postmeta. 144 of these share a slug with a captivate post (overlap/dupes).
- Audio independence note: captivate audio is on captivate.fm (stable third party); the 486
  classic MP3s are on the at-risk WP server. Rehosting podcast audio to Spaces is a heavy,
  separate operation (hundreds of MP3s) and was NOT done — import will store enclosure URLs.

### Session log — 2026-06-07 (Claude, iACast podcast import)

User directive: "import only the iACast ones, don't worry about the other shows until I get
direction from Michael, but import everything you see for iACast."

DONE:
- iACast PODCAST import COMPLETE. New script `scripts/migrate-podcasts.mjs` (idempotent;
  show upserts on slug, episodes upsert on `guid`). One show "iACast" (id 1, slug/feed_slug
  `iacast`). **575 unique episodes** imported, all with an audio URL:
  - 229 modern Captivate episodes (Captivate show `e0ece56d-...`; audio on captivate.fm — stable).
    Stable UUID guid, show notes, episode no parsed from title. Captivate meta exposes no byte
    size/duration, so those are null for these.
  - 346 classic-only self-hosted episodes (regular wp-posts w/ `/iacast/*.mp3` enclosure; audio
    still on the at-risk WP server). Carry byte length + duration where present.
  - Merged by slug; on the 144 overlapping slugs the Captivate version wins (richer + stable audio).
  - Coverage: 575 audio URLs, 447 episode numbers, 574 show notes, 198 byte lengths, 125 durations.
    Dates span 2015-08-24 → 2024-02-13.
- The iACast page (`/iacast-network`) already queried `podcast_episodes` and now renders the
  latest 12 from Neon (was empty before). No UI change needed for data to appear.
- DELIBERATELY EXCLUDED (per directive, pending Michael): the other 5 Captivate shows —
  SafetyCast (33), two language/"Spanish" shows (14 + 6), and two unnamed shows (10 + 8).
  Their show UUIDs are in the script's findings; importing them later is a small change.

SCHEMA DRIFT FOUND (Drizzle schema.ts vs live Neon, NOT fixed — flag for later):
- `podcast_shows`: live column is `itunes_category` (schema.ts says `category`); live `explicit`
  is `boolean` (schema.ts says `text`). The import script targets the LIVE columns. Any Drizzle
  ORM query that selects `category`/`explicit` on shows would fail — `getLatestPodcastEpisodes`
  avoids them so the page works. Worth reconciling schema.ts ↔ DB in a dedicated pass.

### Session log — 2026-06-07 (Claude, iACast UI + episode artwork + blog image fallback)

User directives: "build the podcast browse UI + episode pages + homepage latest; get artwork
for the episodes too" then "the blog images are tiny squares — use the iA logo, not little
squares, fix it."

DONE:
- EPISODE ARTWORK. Added nullable `image_url` to BOTH `podcast_episodes` and `podcast_shows`
  (additive DDL, Taylor approved artwork → needed the column; also added to schema.ts). Updated
  `migrate-podcasts.mjs`: episode art from `cfm_episode_artwork` (50 iACast episodes have unique
  Captivate art), show art = the "iACast Network" iTunes cover (resolved via iTunes Podcast API).
  Episodes with no own art fall back to the show cover. Re-ran import (idempotent).
- iACast BROWSE UI. Routed through accessibility-lead FIRST (project hook) — returned a full
  WCAG 2.2 AA spec; implementation follows it. New `src/components/podcast/podcast-browser.tsx`
  (mirrors the audited directory-browser: search, 12/page pagination, polite live-region counts,
  focus-to-results-heading on page change, URL sync, decorative `alt=""`+`aria-hidden` art,
  sr-only download-link disambiguation, native `<audio aria-label>` per card). Rewrote
  `src/app/iacast-network/page.tsx` as a server shell (H1 + sr-only H2 "Browse episodes" +
  AudioSubmissionForm). New episode detail page `src/app/iacast-network/[slug]/page.tsx`
  (generateMetadata title, Breadcrumb nav, H1, audio, download, show-notes via `demoteHeadings`,
  no second `<main>` — global layout provides it + RouteChangeAnnouncer handles route focus).
  Homepage `src/app/page.tsx`: new "Latest iACast Episodes" H2 section (latest 5, H3 card links).
  Added `formatDuration`/`durationSpoken`/`demoteHeadings` to `src/lib/utils.ts`. Data layer:
  `getPodcastEpisodes()` + `getPodcastEpisodeBySlug()` + artwork/duration on summaries. tsc clean;
  verified all routes render (browse 200, episode 200 w/ descriptive <title>, home section, 404).
- BLOG IMAGE FALLBACK FIXED (the "tiny squares" complaint). ROOT CAUSE: 838 of 1,543 posts (54%)
  have NO featured image — confirmed `featured_media: 0` on LIVE WP too (those posts have no image
  anywhere; we already migrated all 511 media). Our `ContentList` + blog detail rendered a 64px iA
  logo centered in a big box → looked like broken little squares across the whole blog. FIX (per
  Taylor: "use the logo, not squares"): replaced the tiny-logo fallback with a full-width BRANDED
  BANNER — larger iA logo (h-20/h-24) + "iAccessibility" wordmark on a soft blue gradient
  (`content-list.tsx`, `blog/[slug]/page.tsx`). Verified via screenshot — reads as intentional
  branding. Also enlarged iACast episode card cover art from 64px → 96px square (podcast covers are
  inherently square; bumped size rather than crop to a banner).

### Session log — 2026-06-07 (Codex, global media-frame parity pass)

User directive: "this is for the blog and not just the podcast" and "apply the same fix globally
across all media rows."

DONE:
- Added shared `BrandedMediaFrame` (`src/components/layout/branded-media-frame.tsx`) so public
  media cards no longer hand-roll tiny image placeholders. It renders real images full-width in a
  stable aspect-ratio frame and renders a large branded iA fallback using the high-resolution
  `iALogo1400.png` asset when no image exists.
- Applied the shared frame globally to current public media rows: blog listing cards, blog detail
  hero, iACast browse cards, iACast episode detail hero, homepage latest iACast cards, homepage
  latest directory cards, and app-directory result cards.
- Blog data layer now attempts a real image in this order: featured image first, then first inline
  body image, then the branded iA fallback. When an inline image is promoted to the hero/detail
  image, the first inline image block is removed from the rendered body to avoid immediate duplicate
  artwork.
- Confirmed migration facts from the export: 1,542 published posts, 705 with featured images, 38
  with inline body images, and only 27 posts where an inline image can rescue a no-featured-image
  post. The rest genuinely need branded fallback art unless Taylor chooses generated/category art.
- Accessibility treatment: media-row/card images are decorative (`alt=""` + `aria-hidden`) because
  the adjacent title/excerpt/date already names the content; blog detail hero uses the migrated WP
  image alt when present. The visible fallback label uses WordPress active blue `#035a9e`; checked
  contrast against the gradient stops at 7.09:1 on white, 6.28:1 on `#eaf2fb`, and 5.31:1 on
  `#cfe1f4`.

### Session log — 2026-06-07 (Codex, homepage landmarks + accessible CMS editor)

User directives:
- Fix random ARIA/region landmarks on the homepage.
- Move "View all" links to the end of Latest Posts, Latest iACast Episodes, and Latest App
  Directory sections.
- Keep section headings as H2 and card titles as H3.
- Build an accessible CMS/block editor similar in spirit to WordPress/VS Code command workflows:
  paragraph default, slash inserter, command palette, headings H1-H6, images, links, lists, Markdown,
  RTF/rich paste, plain text, and save-time accessibility validation.
- Update this file with findings.

DONE:
- Homepage teaser sections now use plain `<section>` elements without `aria-labelledby`, so they no
  longer become noisy named `region` landmarks. H2/H3 hierarchy is preserved. `ContentList` keeps the
  generated H2 `id` (for `/blog` and `/report` pagination hash links) but does NOT connect that id to
  the section as an accessible name.
- "View all posts", "View all podcasts", and "View all directory entries" are at the END of their
  sections per user preference. Keyboard specialist noted that before-grid links reduce tab effort;
  user preference currently wins. Future compromise: provide both before and after if desired.
- Admin CMS exists:
  - `/admin` dashboard
  - `/admin/posts`
  - `/admin/posts/new`
  - guarded by `canAdmin`; Taylor previously confirmed as `admin` in Neon.
- Replaced reliance on BlockNote/Mantine for the post composer. Current custom editor is built from
  native form controls and explicit ARIA:
  - paragraph default block
  - slash inserter opens a keyboard listbox from the start of a block
  - Ctrl/Cmd+K opens a native `<dialog>` command palette
  - commands: Paragraph, Heading 1-6, Image, Bulleted list, Numbered list, Quote
  - image blocks support upload or URL, caption, alt text, and an explicit "decorative image" checkbox
  - Markdown paste parses headings/lists/quotes/images into blocks; rich HTML paste parses headings,
    lists, quotes, figures/images, and paragraphs into blocks; plain text remains editable plain text
  - inline Markdown serializes links, bold, and italic on save
  - save-time accessibility validation blocks body H1s (post title is page H1), skipped heading levels,
    non-decorative images without alt text, and ambiguous/unsafe Markdown link text; invalid fields
    receive focus and `aria-describedby` points to the error
  - command palette uses native `showModal()`, labelled dialog, initial search focus, Escape/Close,
    focus return, `aria-haspopup="dialog"` trigger, conditional `aria-controls`, combobox/listbox with
    `aria-autocomplete="list"`, unique command keys, and a polite command-result-count live region.
- Added site-wide social preview metadata in `src/app/layout.tsx` using the high-resolution iA logo
  with Open Graph/Twitter alt text.
- Added per-post/per-episode Open Graph + Twitter metadata. Blog/episode detail image alt no longer
  lies by calling a real post image "iAccessibility logo"; if no image-specific alt exists, it falls
  back to a title-based description.
- Added `normalizeEmbeddedHeadings()` and applied it to blog posts and iACast show notes so imported
  WordPress/legacy HTML cannot introduce duplicate body H1s or skip heading levels when rendered.
- Verified categories are migrated in live Neon on 2026-06-07:
  - `blog_categories`: 244
  - `post_categories`: 2,278
  - `directory_categories`: 231
  - `directory_entry_categories`: 248
- Verification:
  - `npm run typecheck` passed after restoring missing local `typescript` dependency with `npm install`.
  - `npm run typecheck` passed again after the final editor accessibility patches.
  - `npm run build` passed after the final editor accessibility patches.
  - `npm install` reported 10 existing audit findings (6 moderate, 4 high); DID NOT run `npm audit fix`
    because that can introduce dependency churn outside this task.

ACCESSIBILITY AGENT FINDINGS ADDRESSED:
- `aria-specialist`: homepage named sections were the source of noisy regions; removed the naming.
- `keyboard-navigator`: restoring `latest-posts-heading` H2 id avoids breaking existing hash links.
- `modal-specialist`: custom command palette modal was replaced with native `<dialog>` + focus return.
- `forms-specialist`: body/image validation now associates error text with the exact failing field.
- `alt-text-headings`: blog/episode body HTML now normalizes headings; social image alt is no longer
  inaccurate; decorative image blocks are supported.
- `live-region-controller`: repeated status messages now clear/re-announce, saving is announced,
  featured-image upload completion is announced, command-palette status clears on close/open, and the
  block-inserter status is shorter.
- `contrast-master`: no contrast/focus blockers; link/focus/error colors pass AA. Non-blocking notes:
  disabled move buttons and decorative-alt disabled inputs could use explicit disabled colors later,
  and selected listbox options could add a non-color selected cue.
- `link-checker`: homepage/list links are descriptive. Editor-generated Markdown links now block vague
  labels like "click here", raw URL labels, repeated labels pointing to different destinations, and
  file/audio links without file type or purpose in the text.
- `accessibility-lead`: fixed conditional `aria-controls` for block menus, command-palette expanded
  state/conditional control target, no-results text outside the listbox, H1 body guidance, and
  sitewide Twitter image alt.

NOTES:
- The old BlockNote dependencies are still present in `package.json` for now, but the active post
  editor no longer imports BlockNote. Removing those dependencies can be done in a small cleanup pass
  after user confirms the custom editor direction.
- WordPress references used during this pass: official Block Editor Handbook docs for keyboard
  shortcuts, command palette (`cmd+k`), block editor architecture, and Gutenberg accessibility testing.

### Still pending
- OTHER PODCAST shows — 5 remaining Captivate shows await Michael's naming direction.
- Podcast audio rehost — the 346 classic iACast MP3s still point at live `iaccessibility.net/iacast`
  (part of the broader media-rehost / WP-independence task). Captivate audio is already off-site.
- MEDIA rehost off `wp-content` to Spaces (full WP independence) — all 511 media + ~705
  featured images + 9 inline body images still point at live `iaccessibility.net/wp-content`.
  Also fix `media.alt` to use real `_wp_attachment_image_alt`. NOT started.
- Category FILTER on the POSTS listing (Start-testing filter component) — data migrated
  (244 categories + links), so this is unblocked.
- Real full-text blog search; colleagues' forgot-password notes (specifics needed).
- Non-site tasks: add Lauren as GitHub collaborator (need handle); fork into a separate
  blog-post-submission app (Beyond-The-Gallery-based).
