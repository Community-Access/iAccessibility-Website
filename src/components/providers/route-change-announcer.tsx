"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function RouteChangeAnnouncer() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;

    previousPathname.current = pathname;

    window.requestAnimationFrame(() => {
      const main = document.getElementById("content");
      main?.focus({ preventScroll: true });
    });
  }, [pathname]);

  return null;
}
