import type { Metadata } from "next";

import { Header } from "@/components/layout/header";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AnnouncerProvider } from "@/components/providers/announcer";
import { ToastProvider } from "@/components/providers/toast-provider";
import { RouteChangeAnnouncer } from "@/components/providers/route-change-announcer";
import { CookieConsent, CookiePreferencesButton } from "@/components/cookie-consent";

import "./globals.css";

/*
 * Force dynamic rendering for every route under the root layout. The shared
 * <Header> resolves the signed-in user from auth cookies (getCurrentUser ->
 * cookies()), so no page wrapped by this layout can be statically prerendered.
 * Declaring it here makes that explicit and stops Next from probing each route
 * for static generation (which otherwise logs DYNAMIC_SERVER_USAGE during
 * build). Per-route data freshness is unaffected.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "iAccessibility",
    template: "%s - iAccessibility",
  },
  description:
    "iAccessibility: accessible technology news, app directory, guidelines, and the iACast podcast network.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Dark-mode boot script: applies the OS color-scheme class before paint
          so there is no theme flash. suppressHydrationWarning on <html> covers
          the class it may add. (Foundation contract section 8.)
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=window.matchMedia('(prefers-color-scheme: dark)');function a(v){document.documentElement.classList.toggle('dark',v.matches)}a(m);m.addEventListener('change',a)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        {/* First focusable in <body>; lands focus on <main>. */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <AuthProvider>
          <AnnouncerProvider>
            <ToastProvider>
              {/* Moves focus + announces the page title on SPA navigation. */}
              <RouteChangeAnnouncer />

              {/* Non-modal cookie banner, placed early in the DOM so screen
                  readers reach it near the top of the document. */}
              <CookieConsent />

              <header>
                {/* Header renders the <nav aria-label="Main"> inside this
                    landmark and resolves its own user for RBAC DOM gating. */}
                <Header />
              </header>

              <main id="main-content" tabIndex={-1}>
                {children}
              </main>

              <footer className="mt-12 border-t border-border bg-secondary text-secondary-foreground">
                <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} iAccessibility. Accessible
                    technology news, apps, guidelines, and the iACast podcast
                    network.
                  </p>
                  <CookiePreferencesButton />
                </div>
              </footer>
            </ToastProvider>
          </AnnouncerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
