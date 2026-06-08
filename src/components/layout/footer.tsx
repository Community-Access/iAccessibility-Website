import Link from "next/link";
import { CookieConsent } from "@/components/providers/cookie-consent";

const SOCIAL_LINKS = [
  { label: "Mastodon", href: "https://iaccessibility.social/@iaccessibility" },
  { label: "X", href: "https://x.com/iaccessibility1" },
  { label: "Facebook", href: "https://www.facebook.com/iaccessibility" }
];

export function Footer() {
  return (
    <footer className="mt-10 bg-[#55555e] text-white" aria-label="Site">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-center">
        <ul className="flex flex-wrap items-center justify-center gap-2">
          {SOCIAL_LINKS.map((social) => (
            <li key={social.label}>
              <a
                href={social.href}
                rel="noopener noreferrer"
                target="_blank"
                className="inline-flex items-center rounded-md px-3 py-2 text-sm text-white underline-offset-4 hover:bg-white/10 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {social.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>

        <p className="text-sm text-slate-100">&copy; 2026 iAccessibility</p>

        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
          <CookieConsent />
          <Link
            href="/about"
            className="text-slate-100 underline-offset-4 hover:underline"
          >
            About
          </Link>
          <Link
            href="/privacy"
            className="text-slate-100 underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          <a
            href="/feed.xml"
            className="text-slate-100 underline-offset-4 hover:underline"
          >
            RSS feed
          </a>
        </div>
      </div>
    </footer>
  );
}
