import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="New password"
      title="Secure your creator workspace."
      description="Choose a fresh password for your ReelMind AI account."
      alternateText="Already updated?"
      alternateLabel="Sign in"
      alternateHref="/login"
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
