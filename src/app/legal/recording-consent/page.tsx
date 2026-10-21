import { SiteHeader } from "@/components/marketing/site-header";

export default function RecordingConsentPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold">Recording Consent Information</h1>
        <p className="mt-4 text-muted-foreground">
          Teachers must obtain appropriate consent before recording lessons. Browser-based capture
          may not record every conferencing participant depending on browser, app, and device
          limitations. Guardian consent may be required for minors.
        </p>
      </main>
    </>
  );
}
