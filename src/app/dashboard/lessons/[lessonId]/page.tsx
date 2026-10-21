import Link from "next/link";
import { notFound } from "next/navigation";

import { LessonAiReportPanel } from "@/components/lessons/lesson-ai-report-panel";
import { LessonTranscriptView } from "@/components/lessons/lesson-transcript-view";
import { TranscribeLessonPanel } from "@/components/lessons/transcribe-lesson-panel";
import { requireSessionUser } from "@/lib/auth/get-session-user";
import {
  isAnthropicConfigured,
  isClaudeTestMode,
  CLAUDE_TEST_LIMITS,
} from "@/lib/anthropic/config";
import { getAiAnalysisSettings } from "@/lib/anthropic/get-ai-analysis-settings";
import type { LessonAiReport } from "@/lib/anthropic/lesson-report-schema";
import { formatLessonDuration } from "@/lib/lessons/lesson-feedback-buckets";
import { isDeepgramConfigured } from "@/lib/deepgram/config";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  await requireSessionUser();
  const { lessonId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: lesson, error } = await supabase
    .from("lessons")
    .select(
      `
      id,
      status,
      teaching_platform,
      recording_duration_seconds,
      detected_language,
      transcription_provider,
      transcription_model,
      processing_duration_ms,
      transcription_cost_estimate,
      error_message,
      created_at,
      students(display_name),
      recording_assets(kind, byte_size, duration_ms),
      transcript_segments(id, source, speaker_label, started_at_ms, ended_at_ms, text)
    `,
    )
    .eq("id", lessonId)
    .eq("teacher_id", user!.id)
    .maybeSingle();

  if (error || !lesson) {
    notFound();
  }

  const studentName =
    typeof lesson.students === "object" && lesson.students && "display_name" in lesson.students
      ? String(lesson.students.display_name)
      : "Student";

  const assets = Array.isArray(lesson.recording_assets) ? lesson.recording_assets : [];
  const segments = (Array.isArray(lesson.transcript_segments) ? lesson.transcript_segments : []).sort(
    (a, b) => a.started_at_ms - b.started_at_ms,
  );
  const hasTeacherTranscript = segments.some((segment) => segment.source === "teacher_microphone");
  const hasTranscript = segments.length > 0;
  const canTranscribeClassroom = assets.some((asset) => asset.kind === "classroom_tab");

  const { data: aiReportRow } = await supabase
    .from("lesson_ai_reports")
    .select(
      "id, status, approval_status, model, report_json, edited_report_json, input_tokens, output_tokens, estimated_cost_usd, error_message, generated_at",
    )
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const aiSettings = await getAiAnalysisSettings();
  let testBudgetUsedUsd = 0;
  if (isClaudeTestMode()) {
    const service = createServiceClient();
    if (service) {
      const { data: usageRows } = await service
        .from("lesson_ai_usage_logs")
        .select("estimated_cost_usd")
        .eq("test_mode", true);
      testBudgetUsedUsd = (usageRows ?? []).reduce(
        (sum, row) => sum + Number(row.estimated_cost_usd ?? 0),
        0,
      );
    }
  }

  const initialReport = (aiReportRow?.report_json as LessonAiReport | null) ?? null;
  const initialEdited = (aiReportRow?.edited_report_json as LessonAiReport | null) ?? null;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <Link href="/dashboard/lessons" className="text-sm font-semibold text-primary hover:underline">
            ← Back to lessons
          </Link>
          <Link
            href={`/dashboard/lessons/${lessonId}/review`}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Review lesson feedback →
          </Link>
        </div>
        <h1 className="mt-4 text-2xl font-bold">{studentName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Platform: {lesson.teaching_platform} · Status: {lesson.status}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Duration", formatLessonDuration(lesson.recording_duration_seconds)],
            ["Provider", lesson.transcription_provider ?? "Not transcribed"],
            ["Model", lesson.transcription_model ?? "—"],
            ["Language", lesson.detected_language ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>
        {lesson.error_message ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{lesson.error_message}</p>
        ) : null}
      </section>

      <TranscribeLessonPanel
        lessonId={lesson.id}
        canTranscribeClassroom={canTranscribeClassroom}
        hasTeacherTranscript={hasTeacherTranscript}
        deepgramConfigured={isDeepgramConfigured()}
      />

      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Transcript</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Speaker labels use recording source information. Diarization hints may appear as unassigned
          speakers until you confirm roles.
        </p>
        <div className="mt-4">
          <LessonTranscriptView segments={segments} />
        </div>
      </section>

      <LessonAiReportPanel
        lessonId={lesson.id}
        hasTranscript={hasTranscript}
        initialReport={initialReport}
        initialEditedReport={initialEdited}
        reportMeta={
          aiReportRow
            ? {
                id: aiReportRow.id,
                status: aiReportRow.status,
                approval_status: aiReportRow.approval_status,
                model: aiReportRow.model,
                input_tokens: aiReportRow.input_tokens,
                output_tokens: aiReportRow.output_tokens,
                estimated_cost_usd: aiReportRow.estimated_cost_usd,
                error_message: aiReportRow.error_message,
                generated_at: aiReportRow.generated_at,
              }
            : null
        }
        testMode={isClaudeTestMode()}
        regenerationAllowed={aiSettings.regenerationAllowed}
        testBudgetUsd={aiSettings.testModeBudgetUsd ?? CLAUDE_TEST_LIMITS.devBudgetUsd}
        testBudgetUsedUsd={testBudgetUsedUsd}
        anthropicConfigured={isAnthropicConfigured()}
      />
    </div>
  );
}
