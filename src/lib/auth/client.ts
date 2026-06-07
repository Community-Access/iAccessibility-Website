"use client";

import { createAuthClient } from "@neondatabase/auth/next";

// Browser-side Neon Auth client. Talks to our same-origin /api/auth/[...path]
// proxy (see app/api/auth), which forwards to the managed Neon Auth service.
// Use in client components for sign-in/out and session hooks.
export const authClient = createAuthClient();
