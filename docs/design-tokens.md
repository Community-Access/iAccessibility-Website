# iAccessibility Design Tokens

Baseline captured from the live GeneratePress WordPress site on 2026-06-07.

## Colors

- Header background: `#0066bf`
- Navigation background: `#1e73be`
- Navigation active/hover background: `#035a9e`
- Link blue: `#1e73be`
- Content background: `#ffffff`
- Form input background: `#fafafa`
- Form input border: `#cccccc`
- Body text: `#222222`
- Muted text: `#595959`
- Footer background: `#55555e`

## Typography

- Font stack: `-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`
- Body font size: `17px`
- Body line height: `1.5`
- Mobile heading scale from GeneratePress: `h1 31px`, `h2 27px`, `h3 24px`, `h4 22px`.

## Layout

- Desktop content follows the WordPress rhythm: a constrained `grid-container`, white
  article surfaces, and a right-sidebar feel where useful.
- Header/navigation height follows the current 60px logo/navigation line.
- Cards use at most 8px radius unless a native/auth component requires otherwise.
- The public site defaults to the live WordPress light palette. Do not auto-enable dark
  mode from `prefers-color-scheme` until a matching dark palette is approved.
- Respect `prefers-reduced-motion: reduce` by disabling smooth scrolling and
  nonessential animation/transition timing.
