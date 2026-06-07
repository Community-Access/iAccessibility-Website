import Link from "next/link";

/*
 * iAccessibility home / landing page.
 *
 * The app shell (src/app/layout.tsx) owns the page landmarks — <header>,
 * <main id="main-content" tabindex="-1">, and <footer> — and the skip-link
 * target. This page therefore renders ONLY its content with exactly one <h1>;
 * adding another <main>/<header>/<footer> or a second #main-content would
 * duplicate a landmark and break the skip link.
 *
 * Heading structure: a single <h1> in the hero, then sibling <h2>s introducing
 * the four public content areas (Report, iACast, Directory, Guidelines).
 * Levels are never skipped. Per the foundation contract we do NOT wrap these
 * groups in role="region"/<section aria-labelledby> — they are plain <div>s
 * under their headings, because users navigate by heading.
 *
 * Color comes entirely from the verified design tokens: the hero uses the deep
 * blue primary fill (white text, 7.09:1) and the hero/heading accent token;
 * cards sit on the card surface with a token border; links inherit the global
 * accent-blue underline (4.94:1 light / 8.11:1 dark). Both themes follow from
 * the design tokens (the ia-* brand vars and the semantic vars), so light and
 * dark both pass AA without per-page overrides. Every link text is descriptive
 * (the destination area is named in
 * the link itself) — no "click here" / "read more".
 */

// The four public content areas the platform is organized around (platform
// spec: blog/reviews, podcasts, directory, guidelines). Each carries an intro
// and one descriptive link to its area.
const AREAS: {
  href: string;
  heading: string;
  intro: string;
  linkText: string;
}[] = [
  {
    href: "/blog",
    heading: "The iAccessibility Report",
    intro:
      "In-depth reviews and accessible technology news, covering how apps, devices, and platforms work for people who rely on assistive technology.",
    linkText: "Read the iAccessibility Report",
  },
  {
    href: "/podcasts",
    heading: "iACast podcasts",
    intro:
      "The iACast network — conversations about accessibility, Apple, and assistive technology, with episodes you can play in the browser, download, and read along with a transcript.",
    linkText: "Listen to the iACast podcasts",
  },
  {
    href: "/directory",
    heading: "App Directory",
    intro:
      "A community-curated directory of accessible apps. Browse by category to find apps that work with screen readers and other assistive technology, or sign in to submit one for review.",
    linkText: "Browse the App Directory",
  },
  {
    href: "/guidelines",
    heading: "Guidelines",
    intro:
      "Practical accessibility guidelines for developers and designers — clear, actionable guidance for building software that everyone can use.",
    linkText: "Read the accessibility Guidelines",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      {/* Hero — the single <h1> for the page. Deep-blue primary fill with
          white text (7.09:1); the supporting copy uses primary-foreground at a
          softer opacity that still clears AA on the deep-blue fill. */}
      <div className="rounded-lg bg-primary px-6 py-12 text-primary-foreground sm:px-10 sm:py-16">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          iAccessibility
        </h1>
        <p className="mt-4 max-w-2xl text-lg font-medium sm:text-xl">
          Making Success Accessible.
        </p>
        <p className="mt-4 max-w-2xl text-base text-primary-foreground/90">
          Accessible technology news and reviews, the iACast podcast network, a
          directory of accessible apps, and guidelines for building software
          that works for everyone.
        </p>
      </div>

      {/* Content-area introductions. Plain divs under <h2>s (no region roles);
          each card names its destination in the link text. */}
      <div className="mt-10 grid gap-6 sm:mt-14 sm:grid-cols-2">
        {AREAS.map((area) => (
          <div
            key={area.href}
            className="flex flex-col rounded-lg border border-border bg-card p-6 text-card-foreground"
          >
            <h2 className="text-2xl font-semibold tracking-tight text-ia-blue-hero">
              {area.heading}
            </h2>
            <p className="mt-3 flex-1 text-base text-muted-foreground">
              {area.intro}
            </p>
            <p className="mt-4">
              <Link href={area.href} className="font-medium">
                {area.linkText}
              </Link>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
