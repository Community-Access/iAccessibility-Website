import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Providers } from "@/components/providers/providers";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl()),
  title: {
    default: "iAccessibility - Making Success Accessible",
    template: "%s | iAccessibility"
  },
  description:
    "Making Success Accessible through accessible technology reporting, podcasts, community, and app discovery."
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
