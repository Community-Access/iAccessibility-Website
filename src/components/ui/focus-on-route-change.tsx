"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function FocusOnRouteChange({
  targetId,
  message
}: {
  targetId: string;
  message: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const didMount = useRef(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }

    document.getElementById(targetId)?.focus();
    setAnnouncement("");
    const timer = window.setTimeout(() => setAnnouncement(message), 20);
    return () => window.clearTimeout(timer);
  }, [message, routeKey, targetId]);

  return (
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </p>
  );
}
