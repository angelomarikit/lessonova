import { SiteHeader } from "@/components/marketing/site-header";

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-4 text-muted-foreground">
          Placeholder legal page for Phase 1. Replace with counsel-reviewed policy before production
          launch. Lessonova processes lesson recordings and student data under the Philippine Data
          Privacy Act considerations described in the product specification.
        </p>
      </main>
    </>
  );
}
