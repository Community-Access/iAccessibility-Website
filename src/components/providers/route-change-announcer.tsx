"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

export function RouteChangeAnnouncer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locationKey = `${pathname}?${searchParams.toString()}`;
  const previousLocationKey = useRef(locationKey);

  useEffect(() => {
    if (previousLocationKey.current === locationKey) return;

    previousLocationKey.current = locationKey;

    window.requestAnimationFrame(() => {
      const main = document.getElementById("content");
      main?.focus({ preventScroll: true });
    });
  }, [locationKey]);

  return null;
}
