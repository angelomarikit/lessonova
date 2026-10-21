"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type SettingsRow = {
  primary_mode: string;
  auto_fallback_enabled: boolean;
  max_retry_attempts: number;
  default_deepinfra_model: string;
  default_deepgram_model: string;
  deepgram_diarize_default: boolean;
};

export function TranscriptionSettingsForm({ initial }: { initial: SettingsRow | null }) {
  const [form, setForm] = useState<SettingsRow>({
    primary_mode: initial?.primary_mode ?? "deepinfra_primary",
    auto_fallback_enabled: initial?.auto_fallback_enabled ?? false,
    max_retry_attempts: initial?.max_retry_attempts ?? 1,
    default_deepinfra_model:
      initial?.default_deepinfra_model ?? "openai/whisper-large-v3-turbo",
    default_deepgram_model: initial?.default_deepgram_model ?? "nova-3",
    deepgram_diarize_default: initial?.deepgram_diarize_default ?? false,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/transcription-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not save settings.");
        return;
      }
      setMessage("Transcription settings saved. Changes apply on the next server-side job.");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="font-medium">Primary mode</span>
        <select
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          value={form.primary_mode}
          onChange={(event) => setForm((prev) => ({ ...prev, primary_mode: event.target.value }))}
        >
          <option value="deepinfra_primary">DeepInfra primary</option>
          <option value="deepgram_primary">Deepgram primary</option>
          <option value="manual">Manual provider selection</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.auto_fallback_enabled}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, auto_fallback_enabled: event.target.checked }))
          }
        />
        Enable automatic fallback (transient errors only; billing/auth never retried)
      </label>

      <label className="block text-sm">
        <span className="font-medium">Max fallback attempts</span>
        <input
          type="number"
          min={0}
          max={3}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          value={form.max_retry_attempts}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              max_retry_attempts: Number(event.target.value),
            }))
          }
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium">Default DeepInfra model</span>
        <input
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          value={form.default_deepinfra_model}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, default_deepinfra_model: event.target.value }))
          }
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium">Default Deepgram model</span>
        <input
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          value={form.default_deepgram_model}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, default_deepgram_model: event.target.value }))
          }
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.deepgram_diarize_default}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, deepgram_diarize_default: event.target.checked }))
          }
        />
        Deepgram diarization for classroom tab tracks (off for teacher mic)
      </label>

      <Button disabled={saving} onClick={() => void save()}>
        {saving ? "Saving..." : "Save transcription settings"}
      </Button>

      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
