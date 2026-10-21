import type { TranscriptSegmentRow } from "@/lib/anthropic/build-transcript-payload";

type LiveUtteranceRow = {
  segment_key: string;
  source: "teacher_microphone" | "classroom_tab";
  speaker_role: string;
  started_at_ms: number;
  ended_at_ms: number | null;
  raw_text: string;
  is_final: boolean;
};

function speakerLabelForLive(row: LiveUtteranceRow): string {
  if (row.speaker_role === "teacher") {
    return "Teacher";
  }
  if (row.source === "classroom_tab") {
    return "Student";
  }
  return "Student/other";
}

function liveToSegment(row: LiveUtteranceRow): TranscriptSegmentRow {
  return {
    id: `live:${row.segment_key}`,
    source: row.source,
    speaker_label: speakerLabelForLive(row),
    started_at_ms: row.started_at_ms,
    ended_at_ms: row.ended_at_ms,
    text: row.raw_text,
  };
}

/** Prefer live Deepgram lines (verbatim fillers/repeats) alongside batch transcript segments. */
export function mergeTranscriptAndLiveUtterances(
  segments: TranscriptSegmentRow[],
  liveUtterances: LiveUtteranceRow[],
): TranscriptSegmentRow[] {
  const liveFinals = liveUtterances
    .filter((row) => row.is_final && row.raw_text.trim() && row.raw_text.trim() !== "…")
    .map(liveToSegment);

  if (segments.length === 0) {
    return liveFinals.sort((a, b) => a.started_at_ms - b.started_at_ms);
  }
  if (liveFinals.length === 0) {
    return segments;
  }

  const merged = [...segments];
  for (const live of liveFinals) {
    const duplicate = segments.some(
      (segment) =>
        segment.source === live.source &&
        Math.abs(segment.started_at_ms - live.started_at_ms) < 2500 &&
        normalizeForCompare(segment.text) === normalizeForCompare(live.text),
    );
    if (!duplicate) {
      merged.push(live);
    }
  }

  return merged.sort((a, b) => a.started_at_ms - b.started_at_ms);
}

function normalizeForCompare(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function formatTranscriptReference(segments: TranscriptSegmentRow[], maxLines = 80): string {
  const sorted = [...segments].sort((a, b) => a.started_at_ms - b.started_at_ms);
  const lines = sorted.slice(0, maxLines).map((segment) => {
    const role =
      segment.source === "teacher_microphone" ||
      segment.speaker_label.toLowerCase().includes("teacher")
        ? "Teacher"
        : "Student";
    return `${role}: ${segment.text}`;
  });
  if (sorted.length > maxLines) {
    lines.push(`… ${sorted.length - maxLines} more lines in the full transcript.`);
  }
  return lines.join("\n");
}

export type { LiveUtteranceRow };
