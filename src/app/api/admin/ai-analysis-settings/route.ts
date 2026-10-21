import { NextResponse } from "next/server";

import { isPlatformSuperAdmin } from "@/lib/auth/is-platform-super-admin";
import { AI_ANALYSIS_SETTINGS_ROW_ID } from "@/lib/anthropic/get-ai-analysis-settings";
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
    .from("platform_ai_analysis_settings")
    .select("*")
    .eq("id", AI_ANALYSIS_SETTINGS_ROW_ID)
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

  const body = (await request.json()) as Record<string, unknown>;
  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 503 });
  }

  const patch: Record<string, unknown> = { updated_by: user.id };
  const fields = [
    "default_model",
    "automatic_analysis_enabled",
    "max_input_tokens",
    "max_output_tokens",
    "regeneration_allowed",
    "test_mode_budget_usd",
  ] as const;

  for (const field of fields) {
    if (body[field] !== undefined) {
      patch[field] = body[field];
    }
  }

  const { data, error } = await service
    .from("platform_ai_analysis_settings")
    .update(patch)
    .eq("id", AI_ANALYSIS_SETTINGS_ROW_ID)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ settings: data });
}
