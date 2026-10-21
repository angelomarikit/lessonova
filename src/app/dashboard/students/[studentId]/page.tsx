import { notFound } from "next/navigation";

import { StudentProfileView } from "@/components/students/student-profile-view";
import { requireSessionUser } from "@/lib/auth/get-session-user";
import type { LessonPlanItem } from "@/lib/students/lesson-plan";
import { formatEnglishLevel, formatLearningGoal } from "@/lib/students/profile-options";
import { createClient } from "@/lib/supabase/server";

type ReportJson = {
  lessonSummary?: { topics?: string[] };
  vocabulary?: { term: string }[];
  areasForImprovement?: { issue?: string; recommendation?: string }[];
  nextLessonRecommendations?: { suggestedTopic?: string };
};

function splitList(value: string | null | undefined) {
  return (value ?? "")
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  await requireSessionUser();
  const { studentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student, error } = await supabase
    .from("students")
    .select(
      "id, display_name, email, english_level, learning_objectives, native_language, target_accent, target_exam, interests, areas_to_improve, notes, hourly_rate, is_active",
    )
    .eq("id", studentId)
    .eq("teacher_id", user!.id)
    .maybeSingle();

  if (error || !student) {
    notFound();
  }

  const { data: lessons } = await supabase
    .from("lessons")
    .select(
      "id, status, created_at, recording_duration_seconds, lesson_ai_reports(report_json, approval_status)",
    )
    .eq("student_id", studentId)
    .eq("teacher_id", user!.id)
    .order("created_at", { ascending: false });

  const historyRaw = lessons ?? [];
  const lessonCount = historyRaw.length;
  const levelProgress = `${formatEnglishLevel(student.english_level)} · ${Math.min(Math.max(lessonCount, 1), 4)}/4`;

  let wordsTaught = 0;
  const stillWorking = new Set(splitList(student.areas_to_improve));
  let suggestedNext =
    student.notes?.trim() ||
    "Record a lesson so the next step can follow what this student actually said.";

  for (const lesson of historyRaw) {
    const reportRel = lesson.lesson_ai_reports;
    const report = Array.isArray(reportRel) ? reportRel[0] : reportRel;
    const json = report?.report_json as ReportJson | null;
    wordsTaught += json?.vocabulary?.length ?? 0;
    for (const area of json?.areasForImprovement ?? []) {
      const label = area.issue || area.recommendation;
      if (label) {
        stillWorking.add(label);
      }
    }
    if (json?.nextLessonRecommendations?.suggestedTopic) {
      suggestedNext = json.nextLessonRecommendations.suggestedTopic;
    }
  }

  const latest = historyRaw[0];
  const { data: planRows, error: planError } = await supabase
    .from("student_lesson_plan_items")
    .select("id, position, scheduled_for, title, focus, plan, source")
    .eq("student_id", studentId)
    .eq("teacher_id", user!.id)
    .order("position", { ascending: true });

  const tableMissing = Boolean(planError?.message?.includes("student_lesson_plan_items"));
  const planItems: LessonPlanItem[] = (planRows ?? []).map((row) => ({
    id: row.id,
    position: row.position,
    scheduledFor: row.scheduled_for,
    title: row.title,
    focus: row.focus,
    plan: row.plan,
    source: row.source === "ai" ? "ai" : "manual",
  }));

  const nextPlan = planItems[0];
  if (nextPlan) {
    suggestedNext = nextPlan.plan || nextPlan.title;
  }

  const profileRows: [string, string][] = [
    ["Goal", formatLearningGoal(student.learning_objectives) ?? "—"],
    ["Native language", student.native_language || "—"],
    ["Target accent", student.target_accent || "No preference"],
    [
      "Hourly rate",
      student.hourly_rate != null ? `$${Number(student.hourly_rate).toFixed(2)}/hr` : "—",
    ],
    ["Lessons taught", String(lessonCount)],
    ["Vocabulary bank", String(wordsTaught)],
    ["Last lesson", latest ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(latest.created_at)) : "—"],
  ];

  const history = historyRaw.map((lesson, index) => {
    const reportRel = lesson.lesson_ai_reports;
    const report = Array.isArray(reportRel) ? reportRel[0] : reportRel;
    const json = report?.report_json as ReportJson | null;
    return {
      id: lesson.id,
      created_at: lesson.created_at,
      recording_duration_seconds: lesson.recording_duration_seconds,
      topic: json?.lessonSummary?.topics?.[0] ?? "Lesson",
      lessonNumber: historyRaw.length - index,
    };
  });

  return (
    <StudentProfileView
      student={{
        id: student.id,
        display_name: student.display_name,
        email: student.email,
        notes: student.notes,
        is_active: student.is_active,
      }}
      lessonCount={lessonCount}
      wordsTaught={wordsTaught}
      levelProgress={levelProgress}
      suggestedNext={suggestedNext}
      profileRows={profileRows}
      areasToImprove={splitList(student.areas_to_improve)}
      interests={student.interests?.trim() || ""}
      stillWorking={[...stillWorking]}
      history={history}
      planItems={planItems}
      tableMissing={tableMissing}
    />
  );
}
