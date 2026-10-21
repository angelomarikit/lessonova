import { RegisterForm } from "@/components/auth/register-form";
import { AuthFooterLink, AuthPageShell } from "@/components/auth/auth-page-shell";

export default function RegisterPage() {
  return (
    <AuthPageShell
      title="Start with 2 free lessons"
      description="Create your Lessonova account and get trial lesson credits after verification."
      sideEyebrow="Built for ESL tutors"
      sideTitle="Focus on teaching while Lessonova handles notes, reports, and progress tracking."
      footer={
        <p className="text-sm text-muted-foreground">
          Already have an account? <AuthFooterLink href="/login">Log in</AuthFooterLink>
        </p>
      }
    >
      <RegisterForm />
    </AuthPageShell>
  );
}
