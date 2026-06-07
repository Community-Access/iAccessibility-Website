# iAccessibility Design Tokens

Canonical design reference for the Next.js rebuild. Values were extracted from the
live iaccessibility.net stylesheet (GeneratePress / GenerateBlocks theme) on
2026-06-06 and verified for WCAG 2.2 AA contrast. Build all UI against these tokens so
the rebuild stays visually parallel to the original site.

Do not lighten the blues: two key pairs sit just above the 4.5:1 AA threshold and any
shift would fail. Preserve the exact hex values below.

## Brand blue system

The site is built on a four-blue system, not a single blue.

- Hero blue `#0066bf` — the site header background and the page body background. This is
  the dominant "iAccessibility blue."
- Accent blue `#1e73be` — the main navigation bar background and the content link color
  (GeneratePress `--accent`).
- Deep blue `#035a9e` — navigation hover, active, and submenu background.
- Membership blue `#0c3d54` — deep accent used by the Paid Memberships Pro UI
  (`--pmpro--color--accent`).

## Neutrals and text

- Primary text `#222222` (GeneratePress `--contrast`).
- Secondary text `#575760` (`--contrast-2`).
- Muted text / borders `#b2b2be` (`--contrast-3`).
- Dark surface `#313233`.
- Surface white `#ffffff` (`--base-3`).
- Off-white surface `#f7f8f9` (`--base-2`), also used as header text color on hero blue.
- Light gray surface `#f0f0f0` (`--base`).

## Region-to-color mapping (from the live CSS selectors)

- `.site-header` — background `#0066bf`, text `#f7f8f9`.
- `body` — background `#0066bf`, text `#222222` (content sits on white containers above
  the blue body).
- `.main-navigation` and submenus — background `#1e73be`, link text `#ffffff`.
- `.main-navigation` hover / active / submenu — background `#035a9e`, text `#ffffff`.
- Content links `a` — `#1e73be`.

## Buttons

- Default button (`.wp-block-button__link`, `.button`) — background `#32373c` (dark
  charcoal), hover `#3f4047`, text `#ffffff`.
- Secondary default button — background `#55555e`.
- Border radius — `9999px` (full pill).
- Padding — `calc(0.667em + 2px)` vertical, `calc(1.333em + 2px)` horizontal.

Note: the original primary button is dark charcoal, not blue. If the team wants a blue
primary CTA, use deep blue `#035a9e` with white text (7.09:1, passes AA comfortably)
rather than the lighter accent blues.

## Typography

- Body font — system stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
  Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif` (GeneratePress default).
- Line height — `1.5`.
- Font-size presets (WordPress): normal `16px`, x-large `42px`; heading sizes scale from
  these.

## Spacing scale (WordPress presets)

`--20` 0.44rem, `--30` 0.67rem, `--40` 1rem, `--50` 1.5rem, `--60` 2.25rem,
`--70` 3.38rem, `--80` 5.06rem.

## Shadows (WordPress presets)

- natural — `6px 6px 9px rgba(0,0,0,0.2)`
- deep — `12px 12px 50px rgba(0,0,0,0.4)`
- sharp — `6px 6px 0px rgba(0,0,0,0.2)`
- crisp — `6px 6px 0px rgb(0,0,0)`

## WCAG 2.2 AA contrast verification (all pass)

- Header text `#f7f8f9` on hero blue `#0066bf` — 5.41:1.
- Nav link `#ffffff` on accent blue `#1e73be` — 4.94:1.
- Nav hover `#ffffff` on deep blue `#035a9e` — 7.09:1.
- Content link `#1e73be` on white — 4.94:1.
- Body text `#222222` on white — 15.91:1.
- Hero blue `#0066bf` text on white — 5.75:1.

## Suggested CSS custom properties for the rebuild

Mirror the GeneratePress variable names so the mapping stays traceable:

- `--ia-blue-hero: #0066bf;`
- `--ia-blue-accent: #1e73be;`
- `--ia-blue-deep: #035a9e;`
- `--ia-blue-membership: #0c3d54;`
- `--ia-text: #222222;`
- `--ia-text-2: #575760;`
- `--ia-text-muted: #b2b2be;`
- `--ia-surface: #ffffff;`
- `--ia-surface-2: #f7f8f9;`
- `--ia-surface-3: #f0f0f0;`

## Dark palette (verified)

OS-synced dark mode (`darkMode: ["class"]`, boot script toggles `.dark`). Derived
by the design-system agent and verified at WCAG 2.2 AA: text/surface and link
pairs at 4.5:1, UI component (border/focus-ring) pairs at 3:1. Every pair below
passes; do not ship dark values that fail. Computed with the standard WCAG
relative-luminance formula.

Surfaces and neutrals (dark):

- Surface `#1a1b1c` (body background, `--ia-surface`).
- Surface-2 / card `#242526` (`--ia-surface-2`).
- Surface-3 `#2e2f30` (`--ia-surface-3`, raised dividers).
- Primary text `#e8e8ed` (`--ia-text`).
- Secondary text `#c4c4cc` (`--ia-text-2`; this is `muted-foreground` in dark,
  NEVER the dim border token).
- Border / disabled `#8a8a94` (`--ia-text-muted`; only this dark value reaches
  the 3:1 UI threshold, so it doubles as the `--border`/`--input` color).

Blues in dark:

- Deep blue `#035a9e` holds in both themes (primary CTA, nav hover fills with
  white text).
- Hero/heading accent lightens to `#4ea3e0` (`--ia-blue-hero`) to read on dark.
- Content link / accent lightens to `#7cb8e8` (`--ia-blue-accent`).
- Focus ring lightens to `#4ea3e0` (`--ring`) for >= 3:1 on dark surfaces.

Destructive in dark: red lightens to `#ff8a85` with dark text `#1a1b1c` on fills.

Verified pairs (dark) — all pass:

- Body text `#e8e8ed` on surface `#1a1b1c` — 14.13:1 (need 4.5).
- Body text `#e8e8ed` on card `#242526` — 12.57:1 (need 4.5).
- Secondary / muted-foreground `#c4c4cc` on surface — 9.95:1; on card — 8.86:1
  (need 4.5).
- Content link `#7cb8e8` on surface — 8.11:1; on card — 7.22:1 (need 4.5).
- Hero/heading accent `#4ea3e0` on surface — 6.27:1; on card — 5.59:1 (need 4.5).
- Nav link white on accent fill `#1e73be` — 4.94:1; on deep-blue fill `#035a9e`
  — 7.09:1 (need 4.5).
- Primary CTA white on deep blue `#035a9e` — 7.09:1 (need 4.5).
- Focus ring `#4ea3e0` (UI) on surface — 6.27:1; on card — 5.59:1 (need 3).
- Border `#8a8a94` (UI) on surface — 5.05:1; on card — 4.49:1 (need 3).
- Error text `#ff8a85` on surface — 7.58:1; on card — 6.75:1 (need 4.5).
- Destructive fill `#ff8a85` with dark text `#1a1b1c` — 7.58:1 (need 4.5).

For completeness, two light pairs not in the original verification table that the
foundation also relies on (both pass):

- Light `muted-foreground` `#575760` on white — 7.15:1; on surface-2 — 6.72:1.
- Light destructive `#b42318` with white text — 6.57:1.
