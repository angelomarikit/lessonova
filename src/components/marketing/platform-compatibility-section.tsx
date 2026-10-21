import { TEACHING_PLATFORMS, formatTestStatus } from "@/lib/recording/platforms";

export function PlatformCompatibilitySection() {
  return (
    <section id="platforms" className="bg-muted py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Platform compatibility
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Works With Your Favorite Teaching Platforms
          </h2>
          <p className="mt-4 text-muted-foreground">
            Whether you&apos;re teaching on Google Meet, Zoom Web, Preply, or another compatible
            browser classroom, Lessonova helps turn your lessons into organized transcripts,
            personalized feedback, and learning insights.
          </p>
        </div>

        <ul className="mt-10 flex flex-wrap justify-center gap-3">
          {TEACHING_PLATFORMS.map((platform) => (
            <li
              key={platform.id}
              className="rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              title={formatTestStatus(platform.testStatus)}
            >
              {platform.name}
            </li>
          ))}
        </ul>

        <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-relaxed text-muted-foreground">
          Works with compatible browser-based lessons. Teacher microphone and shared-tab audio
          permissions are required. Availability depends on your browser, device, and classroom
          platform. Platform names are shown for compatibility guidance only — Lessonova is not
          affiliated with or endorsed by these services unless explicitly stated.
        </p>
      </div>
    </section>
  );
}
