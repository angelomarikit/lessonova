import { PageHeader } from "@/components/dashboard/page-header";
import { LessonsRecordLink } from "@/components/dashboard/lessons-record-link";
import { LessonsStatusBoard } from "@/components/lessons/lessons-status-board";
import { Card, CardContent } from "@/components/ui/card";
import { requireSessionUser } from "@/lib/auth/get-session-user";
import {
  bucketForLesson,
  type LessonListRow,
} from "@/lib/lessons/lesson-feedback-buckets";
import { createClient } from "@/lib/supabase/server";

function topicLabelFromReport(reportJson: unknown): string {
  if (typeof reportJson !== "object" || reportJson === null) {
    return "Introductions and getting started";
  }
  const topics = (reportJson as { lessonSummary?: { topics?: string[] } }).lessonSummary?.topics;
  if (topics?.length) {
    return topics[0];
  }
  return "Introductions and getting started";
}

export default async function LessonHistoryPage() {
  await requireSessionUser();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: lessons } = await supabase
    .from("lessons")
    .select(
      `
      id,
      status,
      student_id,
      recording_duration_seconds,
      created_at,
      students(display_name, english_level),
      lesson_ai_reports(approval_status, status, report_json, edited_report_json)
    `,
    )
    .eq("teacher_id", user!.id)
    .order("created_at", { ascending: false });

  const lessonNumberByStudent = new Map<string, Map<string, number>>();
  const sortedAsc = [...(lessons ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  for (const lesson of sortedAsc) {
    const byStudent =
      lessonNumberByStudent.get(lesson.student_id) ?? new Map<string, number>();
    byStudent.set(lesson.id, byStudent.size + 1);
    lessonNumberByStudent.set(lesson.student_id, byStudent);
  }

  const rows: LessonListRow[] = (lessons ?? []).map((lesson) => {
    const student =
      typeof lesson.students === "object" && lesson.students !== null
        ? (lesson.students as { display_name?: string })
        : null;
    const studentName = student?.display_name?.trim() || "Student";
    const reportRel = lesson.lesson_ai_reports;
    const report = Array.isArray(reportRel) ? reportRel[0] : reportRel;
    const reportJson = report?.edited_report_json ?? report?.report_json;

    return {
      id: lesson.id,
      status: lesson.status,
      recording_duration_seconds: lesson.recording_duration_seconds,
      created_at: lesson.created_at,
      studentName,
      reportApprovalStatus: report?.approval_status ?? null,
      reportStatus: report?.status ?? null,
      lessonNumber: lessonNumberByStudent.get(lesson.student_id)?.get(lesson.id) ?? 1,
      topicLabel: topicLabelFromReport(reportJson),
    };
  });

  const needsReview = rows.filter((row) => bucketForLesson(row) === "needs_review");
  const confirmed = rows.filter((row) => bucketForLesson(row) === "confirmed");
  const completed = rows.filter((row) => bucketForLesson(row) === "completed");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Lesson history"
        title="Every recorded session and its feedback status"
        description="Review transcripts, confirm AI reports, and track processing."
        actions={<LessonsRecordLink />}
      />

      {!lessons?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No lessons recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0 sm:px-2">
            <LessonsStatusBoard
              needsReview={needsReview}
              confirmed={confirmed}
              completed={completed}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
