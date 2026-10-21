import type { TranscriptSegmentRow } from "@/lib/anthropic/build-transcript-payload";
import {
  mergeTranscriptAndLiveUtterances,
  type LiveUtteranceRow,
} from "@/lib/lessons/build-lesson-transcript-segments";
import { createServiceClient } from "@/lib/supabase/service";

export async function loadLessonTranscriptSegments(
  lessonId: string,
): Promise<TranscriptSegmentRow[]> {
  const supabase = createServiceClient();
  if (!supabase) {
    return [];
  }

  const { data: segments, error: segmentError } = await supabase
    .from("transcript_segments")
    .select("id, source, speaker_label, started_at_ms, ended_at_ms, text")
    .eq("lesson_id", lessonId)
    .order("started_at_ms", { ascending: true });

  if (segmentError) {
    return [];
  }

  const { data: live, error: liveError } = await supabase
    .from("lesson_live_transcript_utterances")
    .select(
      "segment_key, source, speaker_role, started_at_ms, ended_at_ms, raw_text, is_final",
    )
    .eq("lesson_id", lessonId)
    .order("started_at_ms", { ascending: true });

  const liveRows =
    liveError?.message?.includes("lesson_live_transcript_utterances") ||
    liveError?.code === "PGRST205"
      ? []
      : ((live ?? []) as LiveUtteranceRow[]);

  return mergeTranscriptAndLiveUtterances(
    (segments ?? []) as TranscriptSegmentRow[],
    liveRows,
  );
}
