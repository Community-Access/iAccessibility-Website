"use client";

import { RouteChangeAnnouncer } from "@/components/providers/route-change-announcer";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RouteChangeAnnouncer />
      {children}
      {/* Mounted persistently so the toast live region exists before any
          message fires (WCAG 4.1.3 Status Messages). */}
      <Toaster />
    </>
  );
}
