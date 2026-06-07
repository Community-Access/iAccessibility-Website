import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Providers } from "@/components/providers/providers";
import { SITE_FALLBACK_IMAGE_URL } from "@/lib/branding";
import { absoluteUrl } from "@/lib/utils";

const siteTitle = "iAccessibility - Making Success Accessible";
const siteDescription =
  "Making Success Accessible through accessible technology reporting, podcasts, community, and app discovery.";

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl()),
  title: {
    default: siteTitle,
    template: "%s | iAccessibility"
  },
  description: siteDescription,
  alternates: {
    types: {
      "application/rss+xml": "/feed.xml"
    }
  },
  openGraph: {
    type: "website",
    siteName: "iAccessibility",
    title: siteTitle,
    description: siteDescription,
    url: "/",
    images: [
      {
        url: SITE_FALLBACK_IMAGE_URL,
        width: 1400,
        height: 1400,
        alt: "iAccessibility logo"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [{ url: SITE_FALLBACK_IMAGE_URL, alt: "iAccessibility logo" }]
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <Header />
          <main id="content" tabIndex={-1} className="min-h-[70vh] py-8">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
