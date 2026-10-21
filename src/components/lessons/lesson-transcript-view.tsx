type TranscriptSegment = {
  id: string;
  source: "teacher_microphone" | "classroom_tab";
  speaker_label: string;
  started_at_ms: number;
  ended_at_ms: number | null;
  text: string;
};

export function LessonTranscriptView({ segments }: { segments: TranscriptSegment[] }) {
  if (segments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No transcript segments saved yet. Run transcription to generate dialogue from your recording.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {segments.map((segment) => (
        <article
          key={segment.id}
          className={
            segment.source === "teacher_microphone"
              ? "rounded-2xl border border-primary/20 bg-primary/5 p-4"
              : "rounded-2xl border border-border bg-muted/40 p-4"
          }
        >
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            <span className="text-primary">{segment.speaker_label}</span>
            <span className="text-muted-foreground">{formatTimestamp(segment.started_at_ms)}</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-muted-foreground">
              {segment.source === "teacher_microphone" ? "Microphone source" : "Classroom tab source"}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{segment.text}</p>
        </article>
      ))}
    </div>
  );
}

function formatTimestamp(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
