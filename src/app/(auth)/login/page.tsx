import { LoginForm } from "@/components/auth/login-form";
import { AuthFooterLink, AuthPageShell } from "@/components/auth/auth-page-shell";

export default function LoginPage() {
  return (
    <AuthPageShell
      title="Welcome back"
      description="Log in to your Lessonova teacher workspace."
      sideEyebrow="Teacher dashboard"
      sideTitle="Record lessons, review AI feedback, and track student progress."
      footer={
        <p className="text-sm text-muted-foreground">
          New to Lessonova? <AuthFooterLink href="/register">Create an account</AuthFooterLink>
        </p>
      }
    >
      <LoginForm />
    </AuthPageShell>
  );
}
