export function ProductDemoSection() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Product demonstration
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              See how Lessonova supports grammar coaching
            </h2>
            <p className="mt-4 text-muted-foreground">
              The interface below uses demonstration data to show how transcripts and AI
              corrections will appear once lesson processing is connected in Phase 3.
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
            <p className="mb-4 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              Demonstration data — not a live lesson
            </p>
            <div className="space-y-4 text-sm">
              <Dialogue speaker="Teacher" highlight={false}>
                What did you do yesterday?
              </Dialogue>
              <Dialogue speaker="Student" highlight={false}>
                Yesterday I go to the mall.
              </Dialogue>
              <Dialogue speaker="Teacher" highlight={false}>
                Good! We should say, I went to the mall.
              </Dialogue>
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  AI correction
                </p>
                <p className="mt-2 text-muted-foreground">
                  <span className="font-medium text-foreground">Original:</span> Yesterday I go to
                  the mall.
                </p>
                <p className="mt-1">
                  <span className="font-medium text-foreground">Corrected:</span> Yesterday I went
                  to the mall.
                </p>
                <p className="mt-2 text-muted-foreground">
                  <span className="font-medium text-foreground">Explanation:</span> Use the past
                  tense of &quot;go&quot; when discussing completed actions in the past.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Dialogue({
  speaker,
  children,
  highlight,
}: {
  speaker: string;
  children: React.ReactNode;
  highlight: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-xl border border-primary/20 bg-primary/5 px-3 py-2"
          : "rounded-xl bg-muted px-3 py-2"
      }
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {speaker}
      </p>
      <p>{children}</p>
    </div>
  );
}
