import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { getAnthropicApiKey, getAnthropicModel, isAnthropicConfigured } from "@/lib/anthropic/config";
import { lessonPlanSuggestionSchema } from "@/lib/students/lesson-plan";
import { formatEnglishLevel, formatLearningGoal } from "@/lib/students/profile-options";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAnthropicConfigured()) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 503 });
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select(
      "id, display_name, english_level, learning_objectives, native_language, target_accent, target_exam, interests, areas_to_improve, notes",
    )
    .eq("id", studentId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (studentError || !student) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  const { data: lessons } = await supabase
    .from("lessons")
    .select("created_at, lesson_ai_reports(report_json)")
    .eq("student_id", studentId)
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentTopics = (lessons ?? [])
    .map((lesson) => {
      const reportRel = lesson.lesson_ai_reports;
      const report = Array.isArray(reportRel) ? reportRel[0] : reportRel;
      const json = report?.report_json as { lessonSummary?: { topics?: string[] } } | null;
      return json?.lessonSummary?.topics?.[0] ?? null;
    })
    .filter(Boolean);

  const profileText = [
    `Student: ${student.display_name}`,
    `Level: ${formatEnglishLevel(student.english_level)}`,
    `Goal: ${formatLearningGoal(student.learning_objectives) ?? "not set"}`,
    `Native language / nationality background: ${student.native_language || "not set"}`,
    `Target accent: ${student.target_accent || "American English"}`,
    `Exam: ${student.target_exam || "none"}`,
    `Hobbies and interests: ${student.interests || "not set"}`,
    `Areas to improve: ${student.areas_to_improve || "not set"}`,
    `Teacher notes: ${student.notes || "none"}`,
    recentTopics.length ? `Recent lesson topics: ${recentTopics.join("; ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const client = new Anthropic({ apiKey: getAnthropicApiKey() });

  try {
    const message = await client.messages.parse({
      model: getAnthropicModel(),
      max_tokens: 1400,
      system:
        "You plan upcoming ESL lessons for one student. Use their hobbies, interests, goal, native language, level, and areas to improve. Target General American English. Write 4 practical lessons in teaching order. Each plan is 2-4 sentences a teacher can follow in a 25-minute class. Do not invent a biography that contradicts the profile.",
      messages: [{ role: "user", content: profileText }],
      output_config: { format: zodOutputFormat(lessonPlanSuggestionSchema) },
    });

    const parsed = message.parsed_output;
    if (!parsed) {
      return NextResponse.json({ error: "Could not read the suggested lesson plan." }, { status: 502 });
    }

    await supabase
      .from("student_lesson_plan_items")
      .delete()
      .eq("student_id", studentId)
      .eq("teacher_id", user.id)
      .eq("source", "ai");

    const { data: existing } = await supabase
      .from("student_lesson_plan_items")
      .select("position")
      .eq("student_id", studentId)
      .eq("teacher_id", user.id)
      .order("position", { ascending: false })
      .limit(1);

    const start = (existing?.[0]?.position ?? -1) + 1;
    const rows = parsed.sessions.map((session, index) => ({
      teacher_id: user.id,
      student_id: studentId,
      position: start + index,
      title: session.title.trim(),
      focus: session.focus.trim(),
      plan: session.plan.trim(),
      source: "ai",
    }));

    const { error: insertError } = await supabase.from("student_lesson_plan_items").insert(rows);
    if (insertError) {
      return NextResponse.json(
        {
          error:
            insertError.message.includes("student_lesson_plan_items")
              ? "Run the lesson plan migration in Supabase, then try again."
              : insertError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, count: rows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not suggest a lesson plan.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
