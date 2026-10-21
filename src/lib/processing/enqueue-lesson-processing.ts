import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/supabase/env";

function getServiceClient() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function enqueueLessonProcessing(lessonId: string, teacherId: string) {
  const supabase = getServiceClient();
  if (!supabase) {
    return {
      ok: false as const,
      status: "blocked" as const,
      message: "Server processing is not configured. Add SUPABASE_SERVICE_ROLE_KEY on Vercel.",
    };
  }

  const hasDeepInfra = Boolean(process.env.DEEPINFRA_API_KEY);
  const hasDeepgram = Boolean(process.env.DEEPGRAM_API_KEY);
  const hasClaude = Boolean(process.env.ANTHROPIC_API_KEY);

  const { data: job, error: jobError } = await supabase
    .from("processing_jobs")
    .insert({
      lesson_id: lessonId,
      teacher_id: teacherId,
      status: hasDeepInfra ? "queued" : "failed",
      transcription_provider: hasDeepInfra ? "deepinfra" : null,
      error_message: hasDeepInfra
        ? null
        : "DeepInfra is not configured. Add DEEPINFRA_API_KEY to enable transcription.",
      metadata: {
        deepgramConfigured: hasDeepgram,
        claudeConfigured: hasClaude,
      },
    })
    .select("id, status")
    .single();

  if (jobError) {
    return { ok: false as const, status: "failed" as const, message: jobError.message };
  }

  const nextLessonStatus = hasDeepInfra ? "queued" : "failed";

  await supabase
    .from("lessons")
    .update({
      status: nextLessonStatus,
      error_message: hasDeepInfra
        ? null
        : "Transcription provider is not configured on the server.",
    })
    .eq("id", lessonId)
    .eq("teacher_id", teacherId);

  return {
    ok: hasDeepInfra,
    status: hasDeepInfra ? ("queued" as const) : ("blocked" as const),
    message: hasDeepInfra
      ? "Lesson uploaded. Transcription and Claude analysis will run in the background once workers are connected."
      : "Upload saved, but transcription is blocked until DEEPINFRA_API_KEY is configured.",
    jobId: job.id,
  };
}
