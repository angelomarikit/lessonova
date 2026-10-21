import Link from "next/link";
import { redirect } from "next/navigation";

import { AiAnalysisSettingsForm } from "@/components/admin/ai-analysis-settings-form";
import { requireSessionUser } from "@/lib/auth/get-session-user";
import { isPlatformSuperAdmin } from "@/lib/auth/is-platform-super-admin";
import { isAnthropicConfigured } from "@/lib/anthropic/config";
import { AI_ANALYSIS_SETTINGS_ROW_ID } from "@/lib/anthropic/get-ai-analysis-settings";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/service";

export default async function AdminAiAnalysisPage() {
  const user = await requireSessionUser();
  if (!(await isPlatformSuperAdmin(user.id))) {
    redirect("/dashboard");
  }

  const supabaseConfigured = getSupabaseEnv().isConfigured;
  let settings = null;
  let metrics = {
    attempts: 0,
    successes: 0,
    failures: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedUsd: 0,
    testModeUsd: 0,
    model: "—",
    recent: [] as string[],
  };

  if (supabaseConfigured) {
    const service = createServiceClient();
    if (service) {
      const [{ data: settingsRow }, { data: logs }] = await Promise.all([
        service
          .from("platform_ai_analysis_settings")
          .select("*")
          .eq("id", AI_ANALYSIS_SETTINGS_ROW_ID)
          .maybeSingle(),
        service
          .from("lesson_ai_usage_logs")
          .select(
            "success, model, input_tokens, output_tokens, estimated_cost_usd, test_mode, error_message, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      settings = settingsRow;
      const rows = logs ?? [];
      metrics = {
        attempts: rows.length,
        successes: rows.filter((row) => row.success).length,
        failures: rows.filter((row) => !row.success).length,
        inputTokens: rows.reduce((sum, row) => sum + Number(row.input_tokens ?? 0), 0),
        outputTokens: rows.reduce((sum, row) => sum + Number(row.output_tokens ?? 0), 0),
        estimatedUsd: rows.reduce((sum, row) => sum + Number(row.estimated_cost_usd ?? 0), 0),
        testModeUsd: rows
          .filter((row) => row.test_mode)
          .reduce((sum, row) => sum + Number(row.estimated_cost_usd ?? 0), 0),
        model: settingsRow?.default_model ?? "claude-haiku-5-5",
        recent: rows
          .slice(0, 8)
          .map(
            (row) =>
              `${row.success ? "OK" : "FAIL"} · ${row.model} · in ${row.input_tokens ?? 0} / out ${row.output_tokens ?? 0}`,
          ),
      };
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">Super admin</p>
      <h1 className="mt-2 text-3xl font-bold">AI analysis usage</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Claude lesson reports — server-side only. Keys are never displayed.
      </p>

      <section className="mt-8 rounded-2xl border border-border bg-white p-6 shadow-sm">
        <p className="text-sm">
          Anthropic configured: {isAnthropicConfigured() ? "Yes" : "No"}
        </p>
      </section>

      {supabaseConfigured ? (
        <>
          <section className="mt-8 rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Policy</h2>
            <div className="mt-4">
              <AiAnalysisSettingsForm initial={settings} />
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Usage (last 100 requests)</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Total requests", metrics.attempts],
                ["Successful", metrics.successes],
                ["Failed", metrics.failures],
                ["Input tokens", metrics.inputTokens],
                ["Output tokens", metrics.outputTokens],
                ["Estimated cost (USD)", metrics.estimatedUsd.toFixed(4)],
                ["Test-mode spend (est.)", metrics.testModeUsd.toFixed(4)],
                ["Default model", metrics.model],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-1 text-lg font-semibold">{value}</p>
                </div>
              ))}
            </div>
            {metrics.recent.length > 0 ? (
              <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
                {metrics.recent.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </section>
        </>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold text-primary">
        <Link href="/admin/transcription" className="hover:underline">
          Transcription settings
        </Link>
        <Link href="/admin/recording" className="hover:underline">
          Recording analytics
        </Link>
      </div>
    </main>
  );
}
