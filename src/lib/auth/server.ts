import "server-only";

import { createNeonAuth } from "@neondatabase/auth/next/server";

// Singleton server-side Neon Auth instance. Neon Auth is a MANAGED Better Auth
// service: we proxy to the hosted base_url provisioned for this branch rather
// than self-hosting an auth server. Exposes the Better Auth server methods
// (getSession, signIn, signOut, ...) plus .handler() and .middleware().
//
// Env (see .env.local):
//   NEON_AUTH_BASE_URL      — hosted Neon Auth endpoint for project
//                             frosty-bar-79561958 / branch main.
//   NEON_AUTH_COOKIE_SECRET — signs the session-cache cookie (>= 32 chars).
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    // 5-minute session cache; upstream re-validation after that.
    sessionDataTtl: 300,
  },
});
