import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth/server";

// Next.js 16 "proxy" convention (formerly "middleware"). Neon Auth proxy:
// refreshes the session cookie and redirects unauthenticated requests on
// matched routes to the sign-in view. This is a coarse gate (authenticated vs
// not); fine-grained capability checks (admin-panel, review queue) are enforced
// server-side in the routes/actions via requireCapability() in
// src/lib/auth/session.ts, which is the authoritative RBAC gate.
const neonProxy = auth.middleware({ loginUrl: "/auth/sign-in" });

export function proxy(request: NextRequest) {
  return neonProxy(request);
}

// Protect the admin panel and the moderation review queues. /admin covers the
// admin dashboard (user/API-key/syndication/podcast management); /review covers
// directory + blog submission approval. Members hitting these are redirected to
// sign-in (if signed out) here, then to /403 (if signed in but unauthorized) by
// requireCapability in the route itself.
export const config = {
  matcher: ["/admin/:path*", "/review/:path*"],
};
