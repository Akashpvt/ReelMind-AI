import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    confirmed?: string;
    error?: string;
  }>;
};

const authErrors: Record<string, string> = {
  confirmation: "Your confirmation link could not be completed. Please try signing in again.",
  configuration: "Supabase setup is required before the creator workspace can be opened.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Enter your creator studio."
      description="Sign in to generate, save, and revisit your complete reel packages."
      alternateText="New to ReelMind AI?"
      alternateLabel="Create an account"
      alternateHref="/signup"
    >
      <AuthForm
        mode="login"
        next={params.next}
        confirmed={params.confirmed === "1"}
        initialError={params.error ? authErrors[params.error] : undefined}
      />
    </AuthShell>
  );
}
