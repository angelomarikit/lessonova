import { createClient } from "@/lib/supabase/server";

function studentDisplayName(students: unknown): { display_name: string } | null {
  if (students && typeof students === "object" && "display_name" in students) {
    return { display_name: String(students.display_name) };
  }
  return null;
}

export type TeacherDashboardSummary = {
  studentCount: number;
  lessonsThisWeek: number;
  draftsToReview: number;
  readyForReview: number;
  failedLessons: number;
  remainingCredits: number | null;
  recentStudents: { id: string; display_name: string }[];
  awaitingLessons: {
    id: string;
    status: string;
    created_at: string;
    students: { display_name: string } | null;
  }[];
};

export async function getTeacherDashboardSummary(
  teacherId: string,
): Promise<TeacherDashboardSummary> {
  const supabase = await createClient();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    studentsRes,
    lessonsWeekRes,
    draftsRes,
    readyRes,
    failedRes,
    creditsRes,
    recentStudentsRes,
    awaitingRes,
  ] = await Promise.all([
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", teacherId)
      .eq("is_active", true),
    supabase
      .from("lessons")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", teacherId)
      .gte("created_at", weekAgo.toISOString()),
    supabase
      .from("lessons")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", teacherId)
      .in("status", ["draft", "uploading", "transcribing", "analyzing"]),
    supabase
      .from("lessons")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", teacherId)
      .eq("status", "ready_for_review"),
    supabase
      .from("lessons")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", teacherId)
      .eq("status", "failed"),
    supabase.from("lesson_credit_ledger").select("delta").eq("user_id", teacherId),
    supabase
      .from("students")
      .select("id, display_name")
      .eq("teacher_id", teacherId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("lessons")
      .select("id, status, created_at, students(display_name)")
      .eq("teacher_id", teacherId)
      .in("status", ["ready_for_review", "transcribing", "draft", "failed"])
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const remainingCredits =
    creditsRes.data && creditsRes.data.length > 0
      ? creditsRes.data.reduce((sum, row) => sum + Number(row.delta ?? 0), 0)
      : null;

  return {
    studentCount: studentsRes.count ?? 0,
    lessonsThisWeek: lessonsWeekRes.count ?? 0,
    draftsToReview: draftsRes.count ?? 0,
    readyForReview: readyRes.count ?? 0,
    failedLessons: failedRes.count ?? 0,
    remainingCredits,
    recentStudents: recentStudentsRes.data ?? [],
    awaitingLessons: (awaitingRes.data ?? []).map((row) => ({
      id: String(row.id),
      status: String(row.status),
      created_at: String(row.created_at),
      students: studentDisplayName(row.students),
    })),
  };
}
