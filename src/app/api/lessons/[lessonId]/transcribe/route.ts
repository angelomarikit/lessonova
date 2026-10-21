import { NextResponse } from "next/server";

import { isDeepInfraConfigured, isDeepInfraTestMode } from "@/lib/deepinfra/config";
import { isDeepgramConfigured } from "@/lib/deepgram/config";
import { transcribeLessonRecording } from "@/lib/processing/transcribe-lesson";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  if (process.env.NODE_ENV !== "development" && process.env.DEEPINFRA_TEST_MODE === "true") {
    return NextResponse.json(
      { error: "DeepInfra test mode is disabled outside development." },
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

  const body = (await request.json().catch(() => ({}))) as {
    force?: boolean;
    source?: "teacher_microphone" | "classroom_tab";
    provider?: "auto" | "deepinfra" | "deepgram";
    allowFallback?: boolean;
  };

  const requestedProvider = body.provider ?? "auto";
  const allowFallback = Boolean(body.allowFallback);

  if (
    requestedProvider === "deepinfra" &&
    !isDeepInfraConfigured()
  ) {
    return NextResponse.json(
      {
        ok: false,
        code: "missing_api_key",
        message:
          "DEEPINFRA_API_KEY is not available on the server. Add it to .env.local and restart the dev server.",
      },
      { status: 503 },
    );
  }

  if (requestedProvider === "deepgram" && !isDeepgramConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        code: "missing_api_key",
        message:
          "DEEPGRAM_API_KEY is not available on the server. Add it to .env.local and restart the dev server.",
      },
      { status: 503 },
    );
  }

  if (
    requestedProvider === "auto" &&
    !isDeepInfraConfigured() &&
    !isDeepgramConfigured()
  ) {
    return NextResponse.json(
      {
        ok: false,
        code: "missing_api_key",
        message:
          "No transcription provider is configured. Add DEEPINFRA_API_KEY and/or DEEPGRAM_API_KEY to .env.local.",
      },
      { status: 503 },
    );
  }

  const result = await transcribeLessonRecording({
    lessonId,
    teacherId: user.id,
    source: body.source,
    force: Boolean(body.force),
    provider: requestedProvider,
    allowFallback,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ...result,
        testMode: isDeepInfraTestMode(),
        deepgramConfigured: isDeepgramConfigured(),
        deepinfraConfigured: isDeepInfraConfigured(),
      },
      { status: result.code === "lesson_not_found" ? 404 : 400 },
    );
  }

  return NextResponse.json({
    ...result,
    testMode: isDeepInfraTestMode(),
  });
}
