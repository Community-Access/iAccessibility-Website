"use client";

import { useRouter } from "next/navigation";
import { NeonAuthUIProvider } from "@neondatabase/auth-ui";

import { authClient } from "@/lib/auth/client";

// App-wide Neon Auth UI context. Renders no visible chrome; provides context
// for sign-in/up views, the user button, and account settings.
// Auth methods: email+password (credentials) and Google + Apple (social).
// Apple's button renders now but only completes once Apple Developer
// "Sign in with Apple" creds are configured on the Neon Auth project
// (deferred followup, like the Facebook key). Google is live via Neon shared OAuth.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => router.refresh()}
      basePath="/auth"
      credentials={{ rememberMe: true }}
      social={{ providers: ["google", "apple"] }}
      defaultTheme="system"
    >
      {children}
    </NeonAuthUIProvider>
  );
}
