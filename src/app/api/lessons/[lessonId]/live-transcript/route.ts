import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
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

  const body = (await request.json()) as {
    utterances?: {
      segmentKey: string;
      source: "teacher_microphone" | "classroom_tab";
      speakerRole: "teacher" | "student" | "unknown";
      isFinal: boolean;
      startedAtMs: number;
      endedAtMs?: number;
      rawText: string;
    }[];
  };

  const utterances = body.utterances ?? [];
  if (utterances.length === 0) {
    return NextResponse.json({ ok: true, saved: 0 });
  }

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const rows = utterances
    .filter((row) => row.isFinal && row.rawText.trim())
    .map((row) => ({
      lesson_id: lessonId,
      teacher_id: user.id,
      source: row.source,
      speaker_role: row.speakerRole,
      segment_key: row.segmentKey,
      is_final: true,
      started_at_ms: row.startedAtMs,
      ended_at_ms: row.endedAtMs ?? null,
      raw_text: row.rawText.trim(),
    }));

  const { error } = await supabase.from("lesson_live_transcript_utterances").upsert(rows, {
    onConflict: "lesson_id,segment_key",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, saved: rows.length });
}
