# iAccessibility Agent Notes

Last updated: 2026-06-07

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
