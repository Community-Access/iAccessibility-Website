"use client";

import { RouteChangeAnnouncer } from "@/components/providers/route-change-announcer";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RouteChangeAnnouncer />
      {children}
    </>
  );
}
