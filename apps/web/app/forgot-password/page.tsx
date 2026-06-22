import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password."
      description="Enter your account email and we will send a secure reset link."
      alternateText="Remembered it?"
      alternateLabel="Sign in"
      alternateHref="/login"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
