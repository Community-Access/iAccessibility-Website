// Neon Auth proxy route. The browser auth client posts here; this handler
// forwards to the managed Neon Auth (Better Auth) service and manages session
// cookies. Covers sign-in/up, OAuth callbacks, sign-out, session, etc.
import { auth } from "@/lib/auth/server";

export const { GET, POST } = auth.handler();
