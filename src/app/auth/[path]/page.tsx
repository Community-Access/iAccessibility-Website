import { AuthPageView } from "@/components/forms/auth-view";

export default async function AuthPage({
  params
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  const mode = path === "sign-up" ? "sign-up" : "sign-in";

  return (
    <div className="wp-container">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold">
          {mode === "sign-up" ? "Sign Up" : "Log In"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {mode === "sign-up"
            ? "Create your iAccessibility account to submit content and join the community."
            : "Sign in to your iAccessibility account."}
        </p>
      </header>
      <AuthPageView mode={mode} />
    </div>
  );
}
