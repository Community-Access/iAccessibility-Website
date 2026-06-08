# Admin / editor feedback backlog

Captured from Taylor's VoiceOver testing session on 2026-06-07. Source of truth
for admin-area improvements. Mirror the **Start-testing** project's admin
(dashboard, ItemTable, actions-list pattern) wherever noted.

Status key: ☐ todo · ◐ in progress · ☑ done · ❓ needs scoping

## Posts list (/admin/posts)
- ☑ GOOD: skip-to-bottom, table, clickable post titles. (keep)
- ☐ Add "Move to Trash" / delete + unpublish a post (WordPress-style). Needs a
  trash/restore concept or hard delete + an unpublish (back to draft) action.

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

## Notes
- Editor = BlockNote (@blocknote/*). Several items (select-all, blank-block on
  Enter, block-options-on-blur, command palette ARIA) are BlockNote behavior/
  config + custom wrappers in src/components/admin/post-editor.tsx.
- All UI changes go through accessibility-lead review per project policy.
