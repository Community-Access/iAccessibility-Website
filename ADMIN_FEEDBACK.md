# Admin / editor feedback backlog

Captured from Taylor's VoiceOver testing session on 2026-06-07. Source of truth
for admin-area improvements. Mirror the **Start-testing** project's admin
(dashboard, ItemTable, actions-list pattern) wherever noted.

Status key: ☐ todo · ◐ in progress · ☑ done · ❓ needs scoping

## Posts list (/admin/posts)
- ☑ GOOD: skip-to-bottom, table, clickable post titles. (keep)
- ☑ Added hard Delete + Unpublish (back to draft). Restorable soft trash is
  deferred because it needs a schema change.

## Block editor (/admin/posts/new)
- ☐ Initial focus lands in a paragraph block — should land in the TITLE field.
- ☐ Draft support: on refresh/leave, prompt to save as draft; have a draft state
  (autosave or explicit). Posts list should show drafts.
- ❓ Live PREVIEW pane (right side) showing rendered output, incl. markdown, so
  you can confirm markdown renders correctly. (scope: split view + a11y)
- ☐ Pressing Enter/H from the title moves to the first EXISTING paragraph block
  instead of a new blank block — should create/move to a blank block.
- ☐ Cannot select-all blocks and delete (Cmd/Ctrl+A then delete). IMPORTANT —
  support select-all-blocks + delete.
- ☐ Skipping/tabbing out of the editor surfaces the block options (drag/handle
  menu) — very annoying with VoiceOver, esp. when deleting a block. Block
  options should not surface on blur/navigation.
- ☑ Command palette trigger is now a plain button: dropped aria-haspopup +
  aria-controls, kept aria-expanded, added aria-keyshortcuts="Meta+K Control+K",
  visible aria-hidden ⌘K kbd, and an sr-only span so the name reads
  "Command palette, Command K".
- ☐ BUG: open command palette → Enter announces "enter the post body" even when
  focus is outside the post. Should insert at the block position, not jump.
- ☑ "Featured image (optional)" now has an `<h2>` inside the `<legend>` so it
  appears in heading nav while keeping the fieldset grouping.
- ☐ Add a MEDIA LIBRARY in the admin dashboard (manage uploaded media).

## Users (/admin/users)
- ☑ Removed the "Review accounts and update access roles…" helper text.
- ◐ Renamed "Recent users" → "All users" (heading + caption). Still TODO: one
  table with pagination + search (part of the Users-table rework).
- ☐ Each user is a link → profile page with more info.
- ☐ Use the SAME ItemTable + actions-list pattern as Start-testing (role update
  actions in an actions menu/column).
- ☑ CONFIRMED CORRECT: cannot change your own role; works on other users.

## Header / chrome (site-wide)
- ☑ Removed the footer "Social links" aria-label (kept the ul/li list).
- ☑ Removed the admin-nav "Signed in as <name> / <role>" block (already shown
  in the user menu); AdminNav no longer takes name/role props.
- ☑ Removed the WhatsApp link from the footer.

## Admin dashboard (/admin)
- ☐ Rebuild to match the Start-testing dashboard (quick actions + content
  cards). Current custom dashboard is bland.
- ◐ Stats pluralized ("2 admins, 0 moderators, …"); full multi-line breakdown
  comes with the dashboard rebuild.
- ☐ Directory apps (81) GOOD; ensure "View all" works. "Improve directory
  entries" — unclear purpose; likely remove.
- ☑ Renamed "Review queue" → "Pending review" (dashboard, nav, review page,
  metadata); empty state kept ("Nothing is waiting for review right now").
- ☑ Removed the duplicate "Manage users" link from Content management.
- ☐ Add a PODCASTS admin section to view/manage the 579 imported episodes
  (edit episodes; future: podcast network, RSS feed management).

## User menu / submissions (added 2026-06-07 PM)
- ☑ Desktop and mobile user menus include Submit App, Submit Blog Post
  (`/report#submit-report`), and Submit Podcast (`/iacast-network`). Dedicated
  audio submit/review flow is still a future route.

## Round 2 status (2026-06-07 PM)
- ☑ Content management copy reworded to "Write, edit, and publish blog posts."
- ◐ "enter the post body" command-palette bug: ROOT CAUSE = the Title is a
  single-line <input> in the form, so Enter submitted the form and fired the
  body-empty validation. Fix in progress: Title Enter → move focus into a blank
  body block (also fixes "Enter jumps to first paragraph"). Pending lead sign-off.
- ☐ ROLE CHANGE: verified the updateUserRole server action is correct (validates,
  writes, revalidates /admin + /admin/users, blocks self-demotion, announces
  success/error). If it's visibly failing, need the exact symptom — otherwise the
  ask is likely the Users-table actions-list rework (Start-testing pattern).
- ☑ DEPLOY CONFIRMED: DO active deployment = commit 5ecc32b; production has the
  batch-1 changes live (WhatsApp removed). "Same bugs" = unfixed editor-behavior
  batch + cached browser tabs (hard-refresh).

## Round 3 shipped (2026-06-07 PM, commit 22c0323)
- ☑ Editor: autofocus Title on mount (editor is new-post only, no edit mode).
- ☑ Editor: beforeunload unsaved-content warning (draft safety).
- ☑ Editor: Title Enter → focus body block (prev commit 7884ffa).
- ☑ Posts list: order by createdAt so drafts show; "Recent posts" → "All posts".
- ☑ Dashboard: Users breakdown is now a <dl> (Admins/Moderators/Members).
- ☑ User menu: added "Submit a blog post" (/report); "Submit an app".

## COMPLETED — full backlog shipped (2026-06-07 PM)
- ☑ Editor: per-block controls collapsed behind one <details> "Block actions"
  disclosure (commit bba6c61).
- ☑ Editor: Cmd/Ctrl+A two-step select-all-blocks + Delete-to-clear + Cmd/Ctrl+Z
  undo (commit 0391cec).
- ☑ Editor: live "Show preview" pane via blocksToHtml (commit 9d9c308).
- ☑ Users: client search + pagination + /admin/users/[id] profile pages
  (commit 271c5fd).
- ☑ Dashboard: Quick actions card grid + dl stat breakdown (commits b8f79c6,
  22c0323).
- ☑ Podcasts admin: /admin/podcasts searchable paginated catalogue (04b5965).
- ☑ Posts: Unpublish (→draft) + Delete (hard, confirm Modal) (commit bba6c61).
- ☑ Submit menu: apps + blog post (/report) + podcast (/iacast-network)
  (commits 22c0323, b8f79c6).
- ☑ Media library: /admin/media — list, edit alt, copy URL, delete (9d9c308).

### Known v1 limitations / deferred polish
- Post "trash" is a HARD delete (confirm-protected), not restorable soft-trash —
  restorable trash needs a `trashed` enum value/column + migration (can't verify
  a prod migration from here, so deferred).
- Live preview renders BELOW the editor (toggle), not a side-by-side right pane —
  responsive two-column layout is a future polish.
- Media library is a flat grid (no search/pagination yet); fine for current
  volume, add pagination if it grows. Object delete is best-effort.
- Block "Change type" is still its own listbox inside the disclosure; a single
  unified per-block menu (lead's preferred end-state) is a future refinement.

## Round 4 — VoiceOver test pass (2026-06-07, App Directory + admin + search + events + users)

### CRITICAL (Taylor: "must be fixed immediately")
- ☑ **Duplicate submissions / no success feedback.** Submitting an app created
  it but showed NO confirmation, so it was submitted ~5 times (5 directory rows).
  ROOT CAUSE FOUND: `directory-submission-form.tsx` onSubmit calls
  `event.currentTarget.reset()` AFTER `await fetch(...)`; React nulls
  `event.currentTarget` after the await → `.reset()` throws → the success
  `setStatus(...)` (line 168) never runs and the form never clears. Fix: capture
  `const form = event.currentTarget` before the await. Done in this branch; the
  form resets and reports published/review status.
- ☐ **Server rendering error in admin.** Taylor hit "there was an error in the
  server rendering components" around the review area. NEEDS REPRO — likely the
  review page or a directory-entry detail render with a null field. Investigate.
- ☑ **Platform misdetected as Android for an App Store app.** App Store autofill
  now forces `iOS/iPadOS`, uses an exact base-category match, and the submission
  API links `iOS: <category>` rather than accidentally selecting Android terms.

### App Directory submit form
- ☑ After picking an app from "App Store Results", the results list dismisses
  and focus moves to App Version.
- ☑ Rating labels now read "Fully Accessible", "Mostly Accessible", "Average",
  "Needs Work", and "Not Accessible" while preserving migrated rating values
  internally.
- ☑ App Description helper text removed.
- ☑ Nutrition-labels empty state removed.
- ☑ Free/Paid includes "Free with in-app purchases".
- ☑ Admins/moderators publish directly; regular members submit for review.
- ☐ Price field UX: confirm it reads cleanly (Taylor flagged "price… five hyphen"
  but that was the rating select; verify price input announces well).

### App Directory display
- ☑ Long card descriptions now include an expandable full-description section so
  the card is scannable without losing the full text.

### Admin review queue
- ☐ Copy: "Pending Report Posts" / "No pending report posts" → "blog posts".
- ☐ Unify into ONE review queue (posts + directory together) for simplicity.
- ☐ Approve/Reject MODALS (model on Beyond the Gallery): Reject opens a modal
  asking why (with rules); Approve allows optional comments. [DECISION]
- ☑ GOOD: approve/reject buttons + focus management work well (keep).

### Search
- ☐ Group results under headings by type (blog posts, podcasts, …) instead of one
  flat grid; say "results" + categorized headings.
- ☐ Consider removing excerpts from the search result grid (Taylor unsure).
- ☑ GOOD: search works.

### Events
- ☑ Added real events data flow: `events` schema, admin add/manage screen,
  canonical `/events` public month view, Google/Outlook/ICS calendar links, and
  WordPress `mc-events` migration into the custom table. `/my-calendar` is only a
  compatibility redirect now.

### Users (/admin/users)
- ☐ Add user management actions: change password, delete user, "more actions".
- ☐ Add a filter like Start-testing's users list.
- ☑ Mirrored the users-tab admin/moderator/member breakdown onto the dashboard.
- ☑ GOOD: per-user profile link + focus return to "All users" works well (keep).

### Editor
- ☑ GOOD: "New post" lands in title→paragraph content as expected (keep).

## Notes
- Editor = custom hand-rolled block editor in
  `src/components/admin/post-editor.tsx`, not BlockNote.
- All UI changes go through accessibility-lead review per project policy.

## Round 5 shipped in branch (2026-06-08)
- ☑ Admin Events section added to nav and dashboard quick actions.
- ☑ Admin Media Library rebuilt as an `ItemTable` with search and media-type
  filters.
- ☑ Admin section nav removed redundant `aria-label`; current page still uses
  `aria-current`.
- ☑ `/plus` replaced with Community Resources; old join/Discord WordPress copy
  removed.
- ☑ Report page form now appears before latest posts, and menu links point to
  `/report#submit-report`.
- ☑ Rating categories are treated as filter-only facets and are not offered as
  submission categories.
