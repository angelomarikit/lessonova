import { SiteHeader } from "@/components/marketing/site-header";

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-4 text-muted-foreground">
          Placeholder terms page for Phase 1. Final terms must be reviewed before accepting paid
          subscriptions.
        </p>
      </main>
    </>
  );
}
