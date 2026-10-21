import { createHash } from "node:crypto";

export type TranscriptSegmentRow = {
  id: string;
  source: "teacher_microphone" | "classroom_tab";
  speaker_label: string;
  started_at_ms: number;
  ended_at_ms: number | null;
  text: string;
};

export function computeTranscriptVersion(segments: TranscriptSegmentRow[]): string {
  const canonical = [...segments]
    .sort((a, b) => a.started_at_ms - b.started_at_ms)
    .map(
      (segment) =>
        `${segment.id}|${segment.source}|${segment.started_at_ms}|${segment.text.trim()}`,
    )
    .join("\n");
  return createHash("sha256").update(canonical).digest("hex");
}

export function formatTranscriptForClaude(segments: TranscriptSegmentRow[]): string {
  const sorted = [...segments].sort((a, b) => a.started_at_ms - b.started_at_ms);
  return sorted
    .map((segment) => {
      const role =
        segment.source === "teacher_microphone" ||
        segment.speaker_label.toLowerCase().includes("teacher")
          ? "Teacher"
          : "Student/other";
      const time = formatMs(segment.started_at_ms);
      return `[${time}] ${role} (${segment.speaker_label}, source=${segment.source}): ${segment.text}`;
    })
    .join("\n");
}

function formatMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
