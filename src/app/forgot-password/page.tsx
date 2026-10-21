import { AuthFooterLink, AuthPageShell } from "@/components/auth/auth-page-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell
      title="Reset your password"
      description="We'll email you a secure link using Supabase Auth."
      sideEyebrow="Account recovery"
      sideTitle="Get back to your lessons, students, and AI reports quickly."
      footer={
        <p className="text-sm text-muted-foreground">
          <AuthFooterLink href="/login">Back to login</AuthFooterLink>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
