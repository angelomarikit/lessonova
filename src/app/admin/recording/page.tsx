import Link from "next/link";

import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function AdminRecordingAnalyticsPage() {
  const supabaseConfigured = getSupabaseEnv().isConfigured;

  let metrics = {
    totalLessons: 0,
    failedLessons: 0,
    telemetryEvents: 0,
    transcriptionAttempts: 0,
    transcriptionSuccess: 0,
    transcriptionFailures: 0,
    audioMinutesProcessed: 0,
    estimatedTranscriptionCostUsd: 0,
    recentErrors: [] as string[],
    byPlatform: [] as { teaching_platform: string | null; count: number }[],
  };

  if (supabaseConfigured) {
    const supabase = await createClient();
    const [
      { count: totalLessons },
      { count: failedLessons },
      { count: telemetryEvents },
      platformRows,
      { data: transcriptionLogs },
    ] = await Promise.all([
      supabase.from("lessons").select("*", { count: "exact", head: true }),
      supabase.from("lessons").select("*", { count: "exact", head: true }).eq("status", "failed"),
      supabase.from("recording_telemetry_events").select("*", { count: "exact", head: true }),
      supabase.from("lessons").select("teaching_platform"),
      supabase
        .from("transcription_usage_logs")
        .select("success, audio_minutes, estimated_cost_usd, error_message, model, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const platformCounts = new Map<string, number>();
    for (const row of platformRows.data ?? []) {
      const key = row.teaching_platform ?? "unknown";
      platformCounts.set(key, (platformCounts.get(key) ?? 0) + 1);
    }

    const logs = transcriptionLogs ?? [];
    metrics = {
      totalLessons: totalLessons ?? 0,
      failedLessons: failedLessons ?? 0,
      telemetryEvents: telemetryEvents ?? 0,
      transcriptionAttempts: logs.length,
      transcriptionSuccess: logs.filter((log) => log.success).length,
      transcriptionFailures: logs.filter((log) => !log.success).length,
      audioMinutesProcessed: logs.reduce((sum, log) => sum + Number(log.audio_minutes ?? 0), 0),
      estimatedTranscriptionCostUsd: logs.reduce(
        (sum, log) => sum + Number(log.estimated_cost_usd ?? 0),
        0,
      ),
      recentErrors: logs
        .filter((log) => !log.success && log.error_message)
        .slice(0, 5)
        .map((log) => String(log.error_message)),
      byPlatform: Array.from(platformCounts.entries()).map(([teaching_platform, count]) => ({
        teaching_platform,
        count,
      })),
    };
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">Super admin</p>
      <h1 className="mt-2 text-3xl font-bold">Recording analytics</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Real telemetry only. Super-admin RBAC enforcement will be tightened in the admin panel phase.
      </p>

      {!supabaseConfigured ? (
        <p className="mt-6 text-sm text-muted-foreground">Connect Supabase to load recording analytics.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Total recordings", metrics.totalLessons],
            ["Failed recordings", metrics.failedLessons],
            ["Telemetry events", metrics.telemetryEvents],
            ["Transcription attempts", metrics.transcriptionAttempts],
            ["Successful transcriptions", metrics.transcriptionSuccess],
            ["Failed transcriptions", metrics.transcriptionFailures],
            ["Audio minutes processed", metrics.audioMinutesProcessed.toFixed(2)],
            ["Estimated transcription cost (USD)", metrics.estimatedTranscriptionCostUsd.toFixed(4)],
            ["Model", "openai/whisper-large-v3-turbo"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      )}

      {metrics.recentErrors.length > 0 ? (
        <section className="mt-8 rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Recent transcription errors</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {metrics.recentErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {metrics.byPlatform.length > 0 ? (
        <section className="mt-8 rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Recordings by platform</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {metrics.byPlatform.map((row) => (
              <li key={row.teaching_platform} className="flex justify-between gap-4">
                <span>{row.teaching_platform}</span>
                <span className="font-semibold">{row.count}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold text-primary">
        <Link href="/admin/transcription" className="hover:underline">
          Transcription settings
        </Link>
        <Link href="/admin/ai-analysis" className="hover:underline">
          AI analysis usage
        </Link>
        <Link href="/dashboard" className="hover:underline">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
