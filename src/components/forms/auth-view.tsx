"use client";

import { AuthView, NeonAuthUIProvider } from "@neondatabase/auth/react/ui";
import { authClient } from "@/lib/auth/client";

export function AuthPageView({ mode }: { mode: "sign-in" | "sign-up" }) {
  return (
    <div className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-wordpress">
      <NeonAuthUIProvider authClient={authClient} defaultTheme="light">
        <AuthView path={mode} />
      </NeonAuthUIProvider>
    </div>
  );
}
