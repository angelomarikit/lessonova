import Link from "next/link";
import { redirect } from "next/navigation";

import { LiveTranscriptionSettingsForm } from "@/components/admin/live-transcription-settings-form";
import { TranscriptionSettingsForm } from "@/components/admin/transcription-settings-form";
import { LIVE_SETTINGS_ROW_ID } from "@/lib/live-transcription/get-live-transcription-settings";
import { isPlatformSuperAdmin } from "@/lib/auth/is-platform-super-admin";
import { requireSessionUser } from "@/lib/auth/get-session-user";
import { isDeepgramConfigured } from "@/lib/deepgram/config";
import { isDeepInfraConfigured } from "@/lib/deepinfra/config";
import { SETTINGS_ROW_ID } from "@/lib/transcription/get-transcription-settings";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/service";

export default async function AdminTranscriptionSettingsPage() {
  const user = await requireSessionUser();
  if (!(await isPlatformSuperAdmin(user.id))) {
    redirect("/dashboard");
  }

  const supabaseConfigured = getSupabaseEnv().isConfigured;
  let settings = null;
  let liveSettings = null;
  let usageStats = {
    attempts: 0,
    deepinfraSuccess: 0,
    deepgramSuccess: 0,
    failures: 0,
    estimatedUsd: 0,
    recentFailures: [] as string[],
  };

  if (supabaseConfigured) {
    const service = createServiceClient();
    if (service) {
      const [{ data: settingsRow }, { data: liveSettingsRow }, { data: logs }] = await Promise.all([
        service
          .from("platform_transcription_settings")
          .select(
            "primary_mode, auto_fallback_enabled, max_retry_attempts, default_deepinfra_model, default_deepgram_model, deepgram_diarize_default",
          )
          .eq("id", SETTINGS_ROW_ID)
          .maybeSingle(),
        service.from("platform_live_transcription_settings").select("*").eq("id", LIVE_SETTINGS_ROW_ID).maybeSingle(),
        service
          .from("transcription_usage_logs")
          .select("success, provider, estimated_cost_usd, error_message, created_at")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      settings = settingsRow;
      liveSettings = liveSettingsRow;
      const rows = logs ?? [];
      usageStats = {
        attempts: rows.length,
        deepinfraSuccess: rows.filter((r) => r.success && r.provider === "deepinfra").length,
        deepgramSuccess: rows.filter((r) => r.success && r.provider === "deepgram").length,
        failures: rows.filter((r) => !r.success).length,
        estimatedUsd: rows.reduce((sum, r) => sum + Number(r.estimated_cost_usd ?? 0), 0),
        recentFailures: rows
          .filter((r) => !r.success && r.error_message)
          .slice(0, 8)
          .map((r) => String(r.error_message)),
      };
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">Super admin</p>
      <h1 className="mt-2 text-3xl font-bold">Transcription settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Server-enforced provider policy. API keys are never shown here.
      </p>

      <section className="mt-8 rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Provider status</h2>
        <ul className="mt-3 space-y-1 text-sm">
          <li>DeepInfra configured: {isDeepInfraConfigured() ? "Yes" : "No"}</li>
          <li>Deepgram configured: {isDeepgramConfigured() ? "Yes" : "No"}</li>
        </ul>
      </section>

      {!supabaseConfigured ? (
        <p className="mt-6 text-sm text-muted-foreground">Connect Supabase to load settings.</p>
      ) : (
        <>
          <section className="mt-8 rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Policy</h2>
            <div className="mt-4">
              <TranscriptionSettingsForm initial={settings} />
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Live transcription settings</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Browser WebSocket to Deepgram uses short-lived tokens from the server (no long-lived key in the client).
            </p>
            <div className="mt-4">
              <LiveTranscriptionSettingsForm initial={liveSettings} />
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Usage (last 100 logs)</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Attempts", usageStats.attempts],
                ["DeepInfra successes", usageStats.deepinfraSuccess],
                ["Deepgram successes", usageStats.deepgramSuccess],
                ["Failures", usageStats.failures],
                ["Estimated cost (USD)", usageStats.estimatedUsd.toFixed(4)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-1 text-lg font-semibold">{value}</p>
                </div>
              ))}
            </div>
            {usageStats.recentFailures.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {usageStats.recentFailures.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}
          </section>
        </>
      )}

      <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold text-primary">
        <Link href="/admin/recording" className="hover:underline">
          Recording analytics
        </Link>
        <Link href="/dashboard" className="hover:underline">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
