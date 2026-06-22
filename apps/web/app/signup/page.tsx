import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Start creating"
      title="Build reels with an AI edge."
      description="Create your account to unlock a focused workspace for ideas, scripts, prompts, and saved projects."
      alternateText="Already have an account?"
      alternateLabel="Sign in"
      alternateHref="/login"
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
