import { NextResponse } from "next/server";

import { isPlatformSuperAdmin } from "@/lib/auth/is-platform-super-admin";
import { SETTINGS_ROW_ID } from "@/lib/transcription/get-transcription-settings";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isPlatformSuperAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 503 });
  }

  const { data, error } = await service
    .from("platform_transcription_settings")
    .select("*")
    .eq("id", SETTINGS_ROW_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isPlatformSuperAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    primary_mode?: string;
    auto_fallback_enabled?: boolean;
    max_retry_attempts?: number;
    default_deepinfra_model?: string;
    default_deepgram_model?: string;
    deepgram_diarize_default?: boolean;
  };

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 503 });
  }

  const patch: Record<string, unknown> = { updated_by: user.id };
  if (body.primary_mode != null) {
    patch.primary_mode = body.primary_mode;
  }
  if (body.auto_fallback_enabled != null) {
    patch.auto_fallback_enabled = body.auto_fallback_enabled;
  }
  if (body.max_retry_attempts != null) {
    patch.max_retry_attempts = body.max_retry_attempts;
  }
  if (body.default_deepinfra_model != null) {
    patch.default_deepinfra_model = body.default_deepinfra_model.trim();
  }
  if (body.default_deepgram_model != null) {
    patch.default_deepgram_model = body.default_deepgram_model.trim();
  }
  if (body.deepgram_diarize_default != null) {
    patch.deepgram_diarize_default = body.deepgram_diarize_default;
  }

  const { data, error } = await service
    .from("platform_transcription_settings")
    .update(patch)
    .eq("id", SETTINGS_ROW_ID)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ settings: data });
}
