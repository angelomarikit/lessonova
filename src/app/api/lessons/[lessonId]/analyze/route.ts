import { NextResponse } from "next/server";

import { isAnthropicConfigured, isClaudeTestMode } from "@/lib/anthropic/config";
import { generateLessonAiReport } from "@/lib/processing/analyze-lesson-report";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  if (process.env.CLAUDE_TEST_MODE === "true" && process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Claude test mode cannot run in production builds." },
      { status: 403 },
    );
  }

  const { lessonId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAnthropicConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        code: "missing_api_key",
        message: "ANTHROPIC_API_KEY is not configured on the server.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    confirmTestCost?: boolean;
    forceRegenerate?: boolean;
  };

  const confirmTestCost =
    Boolean(body.confirmTestCost) || process.env.NODE_ENV === "development";

  const result = await generateLessonAiReport({
    lessonId,
    teacherId: user.id,
    confirmTestCost,
    forceRegenerate: Boolean(body.forceRegenerate) || process.env.NODE_ENV === "development",
    automaticAfterTranscription: confirmTestCost,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ...result,
        testMode: isClaudeTestMode(),
      },
      { status: result.code === "lesson_not_found" ? 404 : 400 },
    );
  }

  return NextResponse.json({
    ...result,
    testMode: isClaudeTestMode(),
  });
}
