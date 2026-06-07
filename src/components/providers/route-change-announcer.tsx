"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function RouteChangeAnnouncer() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (previousPathname.current === pathname) return;

    previousPathname.current = pathname;

    window.requestAnimationFrame(() => {
      const main = document.getElementById("content");
      main?.focus({ preventScroll: true });
      setMessage(`${document.title} loaded`);
    });
  }, [pathname]);

  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
