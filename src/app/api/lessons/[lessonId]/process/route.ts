import { NextResponse } from "next/server";

import { enqueueLessonProcessing } from "@/lib/processing/enqueue-lesson-processing";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("id, teacher_id, status")
    .eq("id", lessonId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (error || !lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const result = await enqueueLessonProcessing(lesson.id, user.id);
  return NextResponse.json(result, { status: result.ok ? 200 : 202 });
}
