"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type SettingsRow = {
  default_model: string;
  automatic_analysis_enabled: boolean;
  max_input_tokens: number;
  max_output_tokens: number;
  regeneration_allowed: boolean;
  test_mode_budget_usd: number;
};

export function AiAnalysisSettingsForm({ initial }: { initial: SettingsRow | null }) {
  const [form, setForm] = useState<SettingsRow>({
    default_model: initial?.default_model ?? "claude-haiku-5-5",
    automatic_analysis_enabled: initial?.automatic_analysis_enabled ?? false,
    max_input_tokens: initial?.max_input_tokens ?? 3000,
    max_output_tokens: initial?.max_output_tokens ?? 800,
    regeneration_allowed: initial?.regeneration_allowed ?? false,
    test_mode_budget_usd: Number(initial?.test_mode_budget_usd ?? 1),
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/ai-analysis-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not save settings.");
        return;
      }
      setMessage("AI analysis settings saved.");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="font-medium">Default Claude model</span>
        <input
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          value={form.default_model}
          onChange={(event) => setForm((prev) => ({ ...prev, default_model: event.target.value }))}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.automatic_analysis_enabled}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, automatic_analysis_enabled: event.target.checked }))
          }
        />
        Automatic analysis after transcription (off during testing)
      </label>
      <label className="block text-sm">
        <span className="font-medium">Max input tokens</span>
        <input
          type="number"
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          value={form.max_input_tokens}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, max_input_tokens: Number(event.target.value) }))
          }
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Max output tokens</span>
        <input
          type="number"
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          value={form.max_output_tokens}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, max_output_tokens: Number(event.target.value) }))
          }
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.regeneration_allowed}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, regeneration_allowed: event.target.checked }))
          }
        />
        Allow regeneration (teachers)
      </label>
      <label className="block text-sm">
        <span className="font-medium">Test-mode budget guard (USD, estimated)</span>
        <input
          type="number"
          step="0.01"
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          value={form.test_mode_budget_usd}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              test_mode_budget_usd: Number(event.target.value),
            }))
          }
        />
      </label>
      <Button disabled={saving} onClick={() => void save()}>
        {saving ? "Saving..." : "Save AI analysis settings"}
      </Button>
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
