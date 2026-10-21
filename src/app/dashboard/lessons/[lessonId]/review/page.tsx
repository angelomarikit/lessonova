import { notFound } from "next/navigation";

import { LessonReviewFeedbackView } from "@/components/lessons/lesson-review-feedback-view";
import { requireSessionUser } from "@/lib/auth/get-session-user";
import { isAnthropicConfigured, isClaudeTestMode } from "@/lib/anthropic/config";
import type { LessonAiReport } from "@/lib/anthropic/lesson-report-schema";
import { formatTranscriptReference } from "@/lib/lessons/build-lesson-transcript-segments";
import { bucketForLesson } from "@/lib/lessons/lesson-feedback-buckets";
import { loadLessonTranscriptSegments } from "@/lib/lessons/load-lesson-transcript-segments";
import { resolveReviewViewModel } from "@/lib/lessons/lesson-review-view-model";
import { createClient } from "@/lib/supabase/server";

function topicLabelFromReport(report: LessonAiReport | null): string {
  const topics = report?.lessonSummary.topics;
  if (topics?.length) {
    return topics[0];
  }
  return "Lesson feedback";
}

function levelLabel(studentLevel: string | null | undefined, lessonNumber: number) {
  if (studentLevel?.trim()) {
    return `${studentLevel} · Lesson ${lessonNumber}`;
  }
  return `Determining level · ${Math.min(lessonNumber, 4)}/4`;
}

export default async function LessonReviewPage({
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
      student_id,
      recording_duration_seconds,
      created_at,
      students(display_name, english_level),
      lesson_ai_reports(approval_status, status, edited_report_json, report_json, error_message)
    `,
    )
    .eq("id", lessonId)
    .eq("teacher_id", user!.id)
    .maybeSingle();

  if (error || !lesson) {
    notFound();
  }

  const { count: earlierLessons } = await supabase
    .from("lessons")
    .select("*", { count: "exact", head: true })
    .eq("teacher_id", user!.id)
    .eq("student_id", lesson.student_id)
    .lte("created_at", lesson.created_at);

  const student =
    typeof lesson.students === "object" && lesson.students !== null
      ? (lesson.students as { display_name?: string; english_level?: string | null })
      : null;
  const studentName = student?.display_name?.trim() || "Student";

  const reportRel = lesson.lesson_ai_reports;
  const reportRow = Array.isArray(reportRel) ? reportRel[0] : reportRel;
  const report =
    (reportRow?.edited_report_json as LessonAiReport | null) ??
    (reportRow?.report_json as LessonAiReport | null);

  const workflowStatus = bucketForLesson({
    status: lesson.status,
    reportApprovalStatus: reportRow?.approval_status ?? null,
  });

  const view = resolveReviewViewModel(report);
  const transcriptSegments = await loadLessonTranscriptSegments(lesson.id);
  const lessonReferenceTranscript = formatTranscriptReference(transcriptSegments);
  const hasTranscript = transcriptSegments.length > 0;
  const hasReportContent = Boolean(
    report &&
      (report.grammarCorrections.length > 0 ||
        report.vocabulary.length > 0 ||
        (report.pronunciationFeedback?.length ?? 0) > 0 ||
        (report.speechFluencyNotes?.length ?? 0) > 0 ||
        report.studentStrengths.length > 0 ||
        report.areasForImprovement.length > 0 ||
        report.lessonSummary.studentFacingSummary.trim()),
  );

  return (
    <LessonReviewFeedbackView
      lessonId={lesson.id}
      studentName={studentName}
      lessonNumber={earlierLessons ?? 1}
      topicLabel={topicLabelFromReport(report)}
      createdAt={lesson.created_at}
      durationSeconds={lesson.recording_duration_seconds}
      isTrialLesson={studentName.toLowerCase() === "sample" || (earlierLessons ?? 1) === 1}
      levelLabel={levelLabel(student?.english_level, earlierLessons ?? 1)}
      workflowStatus={workflowStatus}
      view={view}
      lessonReferenceTranscript={lessonReferenceTranscript}
      hasTranscript={hasTranscript}
      hasReportContent={hasReportContent}
      reportStatus={reportRow?.status ?? null}
      reportError={reportRow?.error_message ?? null}
      anthropicConfigured={isAnthropicConfigured()}
      testMode={isClaudeTestMode()}
    />
  );
}
