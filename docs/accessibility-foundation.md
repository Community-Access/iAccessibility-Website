# iAccessibility Foundation — Accessibility Build Checklist (WCAG 2.2 AA)

Authored by the accessibility lead. Builders implement to these acceptance criteria; the
accessibility lead reviews every foundation component against them before merge. This is
the binding a11y contract for the foundation.

## Resolved decisions
- Cookie consent: NON-MODAL accessible banner (role="dialog", keyboard-reachable, no focus
  trap, Escape = Decline). Keeps the page operable. Not showModal().
- Dark mode: the design-system agent must define dark-palette token values and verify every
  pair (text/surface, link, focus ring, nav, buttons, error) at 4.5:1 text / 3:1 UI BEFORE
  dark mode ships. Light palette is already verified in docs/design-tokens.md.

## Global non-negotiables
- Semantic HTML before ARIA: <button> for actions, <a href> for nav, native <dialog>,
  native <audio controls>, real <table>. No role="button" on divs.
- One token-based focus ring everywhere: focus-visible:ring-2 ring-[--ia-blue-deep]
  ring-offset-2 (deep blue #035a9e = 7.09:1). Never outline:none without a replacement.
- No meaning by color alone; links carry underline.
- Global prefers-reduced-motion guard neutralizing animate-*/transition-* and Radix
  data-[state] animations (NOT present in the reused files - add it).
- Target size >= 24x24 CSS px for every control.
- Focus Not Obscured (2.4.11): <main> gets scroll-margin-top >= sticky header height.
- color-scheme: light dark so native controls render per theme.

## Per-component acceptance criteria

### 1. App shell, landmarks, skip link
- One <header>, one <nav aria-label="Main">, one <main id="main-content" tabindex="-1">,
  one <footer>. Additional navs get distinct aria-labels. Do NOT wrap content groups in
  role="region"/<section aria-labelledby> for grouping - plain <div> + headings.
- Skip link: first focusable in <body>, href="#main-content", visually hidden until focus,
  lands focus on <main> (which has scroll-margin-top >= header height).
- <html lang="en">; per-route titles via metadata.title.template "%s - iAccessibility".
- SPA route changes MUST move focus to <main> (or new page h1) and announce the new title
  via the polite announcer. Build this once in the shell.

### 2. Header + nav + logged-in user menu
- <nav aria-label="Main">; active item aria-current="page" (not color alone).
- Logo link named by text (img alt="" aria-hidden + sr-only/visible "iAccessibility").
- Nav submenus are disclosures: <button aria-expanded aria-controls>, Escape closes +
  returns focus, keyboard-operable (no hover-only).
- User menu (reuse Beyond-The-Gallery-Web/components/layout/header.tsx): trigger button
  aria-haspopup="menu" aria-expanded aria-label="User menu for {name}"; menu role="menu"
  aria-label; items role="menuitem" tabindex=-1; open->focus first item; Arrow/Home/End;
  Escape closes + returns focus to trigger; Tab/outside-click close.
- RBAC gating removes items from the DOM (not just visual hide). Server-enforced; client
  gating is presentation only.

### 3. Responsive data table (users, directory, posts, episodes)
- Desktop real <table> with aria-label or sr-only <caption>; every header <th scope="col">;
  row-label cells <th scope="row"> where applicable.
- Mobile md:hidden cards as role="list"/role="listitem" with aria-label.
- Row actions name-specific: "Edit {name}", "Delete {name}", "Approve {app}", "Reject {app}".
- Loading role="status" aria-label; empty state is plain text.
- Decorative avatars alt="" aria-hidden + initials; directory app icons get real alt (app
  name) OR alt="" if the name is adjacent.
- Sort via labeled <select aria-label="Sort {items} by">; column sorting (if added) uses
  th aria-sort + inner <button>.
- FIX over BTG: announce row-set changes (sort/filter/refresh) via the polite announcer.
- Long tables: skip-over-table links + pagination (do NOT render 1,543 rows).
- text-muted-foreground must map to --ia-text-2 #575760 (7.0:1), NEVER --ia-text-muted
  #b2b2be (~2.0:1, borders/disabled only).

### 4. Modal / dialog (reuse Beyond-The-Gallery-Web/components/ui/modal.tsx, native <dialog>)
- role="dialog" (alertdialog for destructive), aria-labelledby -> visible h2,
  aria-describedby. Native showModal() focus trap - do NOT hand-roll.
- Initial focus first focusable / safe action (Cancel) for destructive.
- Escape closes (native cancel). FIX: capture document.activeElement at open so focus
  return works even without an explicit triggerRef.
- Destructive/consent: disable backdrop-dismiss.
- Button variants use tokens (deep blue/white 7.09:1 or charcoal/white); destructive red
  >= 4.5:1 with text label + icon.

### 5. Cookie-consent banner (NON-MODAL, on tokens)
- <div role="dialog" aria-label="Cookie consent" aria-describedby="...">, keyboard-reachable,
  NO focus trap, Escape = Decline, announced politely on appear, placed early in the DOM.
- Real <button> Accept cookies / <button> Decline + explicit dismiss. Decline honored - no
  analytics until Accept. Choice persisted (localStorage/cookie). Analytics injected only
  post-Accept.
- Once chosen, never reappears; provide a footer "Cookie preferences" link to change it.

### 6. Forms / inputs / validation
- Every field programmatically labeled (<label htmlFor> preferred). Placeholder is not a
  label. BTG Input has no built-in label - the composer supplies one.
- Required via native required (+ visible mark with aria-hidden asterisk; don't rely on
  color/asterisk alone).
- Errors: aria-invalid="true" + aria-describedby -> error text (text + icon, not color).
- On submit with errors: error summary (h2 + links to fields), move focus to it, announce
  assertively. Build once, shared.
- Radio/checkbox groups in <fieldset><legend>.
- autocomplete tokens (email, current-password, new-password). Allow paste in passwords.
- Multi-step (app submission, podcast show create): labeled step regions w/ headings,
  role="status" "Step n of m", focus to new step heading, errors block advance, never lose
  data (SC 3.3.7 redundant entry).
- File upload (audio/artwork/media): labeled input, progress role="status", success/failure
  announced, formats stated in text.
- OAuth Google/Apple satisfies SC 3.3.8 (no memory test).

### 7. Native HTML5 <audio controls> podcast player + chrome
- Native <audio controls> only - NO custom player. aria-label="Audio player: {episode title}".
- Page h1 = episode title (one per page). <h2>Show notes above show-notes body (internal
  headings start at h3). <h2>Transcript above transcript.
- Download: <a href="{url}" download>Download episode ({format}, {size})</a> - descriptive,
  keyboard-reachable, separate from player.
- Transcript disclosure: <button aria-expanded aria-controls> toggling a region; label
  reflects state (Show/Hide transcript); region in normal reading order under the h2. Or a
  descriptive link if transcript is a separate file.
- Speed: native controls only (no custom speed UI).
- Artwork img real alt (context) or alt="" if title is an adjacent heading; waveform/icons
  aria-hidden.
- Content links use accent blue #1e73be (4.94:1) + underline.

### 8. OS-synced dark mode
- Reuse BTG inline boot script verbatim; darkMode:["class"]; suppressHydrationWarning on
  <html>. color-scheme: light dark.
- Define + verify the dark token table (see Resolved decisions). Focus ring stays >= 3:1 in
  BOTH themes (deep-blue ring may need a lighter dark variant).
- Manual toggle deferred; if added, labeled + state-reflecting, must not trap OS-sync users.

### 9. One-H1 / heading structure (site-wide)
- Exactly one <h1> per page. Never skip levels; may return up. Level by structure, not size.
- Migrated WP content (1,543 posts): normalize so body starts at h2 under the page h1, no
  in-body h1 - a MIGRATION acceptance criterion.
- TipTap editor: constrain heading menu to H2-H4 (reserve H1 for title); round-trip across
  Rich/Markdown/HTML preserves heading levels exactly.

## Reuse sources (confirmed; re-color foreign theme colors to iAccessibility tokens)
- BTG app/layout.tsx (skip link, dark-mode boot, lang/title)
- BTG components/layout/header.tsx (nav + user menu)
- BTG components/admin/users-tab.tsx (responsive table)
- BTG components/ui/modal.tsx (native <dialog> base; also cookie-consent base logic)
- BTG components/ui/input.tsx, label.tsx (form primitives)
- Start-testing src/hooks/use-announcer.tsx (route/async announcer - reuse site-wide)
- Start-testing src/components/ui/toast.tsx (Radix toast - re-color to tokens)
- Start-testing src/components/ui/tabs.tsx (editor view switcher)

## Ship gate (reviewed before any foundation merge)
One H1, no skipped levels, landmarks present, skip link lands on focusable <main>, per-route
titled; full keyboard reach, focus managed on route change / dialog open-close / row delete,
Escape closes overlays; no redundant roles, all aria-* IDs resolve, live regions for table
sort / async / form errors / toasts; 4.5:1 text + 3:1 UI + focus ring in BOTH themes, no
color-only meaning, reduced-motion honored, target >= 24px; every input labeled, errors
aria-describedby + focus-to-summary; meaningful alt / decorative hidden, descriptive links
with underline, new-tab warned, no "click here".
