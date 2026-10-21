import { NextResponse } from "next/server";

import { isPlatformSuperAdmin } from "@/lib/auth/is-platform-super-admin";
import { LIVE_SETTINGS_ROW_ID } from "@/lib/live-transcription/get-live-transcription-settings";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isPlatformSuperAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Service role missing" }, { status: 503 });
  }

  const { data, error } = await service
    .from("platform_live_transcription_settings")
    .update({
      live_transcription_enabled: body.live_transcription_enabled,
      streaming_model: body.streaming_model,
      live_corrections_enabled: body.live_corrections_enabled,
      max_live_correction_requests_per_lesson: body.max_live_correction_requests_per_lesson,
      live_correction_interval_seconds: body.live_correction_interval_seconds,
      post_lesson_retranscription_enabled: body.post_lesson_retranscription_enabled,
      updated_by: user.id,
    })
    .eq("id", LIVE_SETTINGS_ROW_ID)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ settings: data });
}
