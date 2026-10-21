"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type Row = {
  live_transcription_enabled: boolean;
  streaming_model: string;
  live_corrections_enabled: boolean;
  max_live_correction_requests_per_lesson: number;
  live_correction_interval_seconds: number;
  post_lesson_retranscription_enabled: boolean;
};

export function LiveTranscriptionSettingsForm({ initial }: { initial: Row | null }) {
  const [form, setForm] = useState<Row>({
    live_transcription_enabled: initial?.live_transcription_enabled ?? false,
    streaming_model: initial?.streaming_model ?? "nova-3",
    live_corrections_enabled: initial?.live_corrections_enabled ?? false,
    max_live_correction_requests_per_lesson:
      initial?.max_live_correction_requests_per_lesson ?? 8,
    live_correction_interval_seconds: initial?.live_correction_interval_seconds ?? 20,
    post_lesson_retranscription_enabled: initial?.post_lesson_retranscription_enabled ?? true,
  });
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    const response = await fetch("/api/admin/live-transcription-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setMessage(response.ok ? "Live transcription settings saved." : "Could not save settings.");
  }

  return (
    <div className="space-y-3 text-sm">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.live_transcription_enabled}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, live_transcription_enabled: event.target.checked }))
          }
        />
        Enable live Deepgram streaming
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.live_corrections_enabled}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, live_corrections_enabled: event.target.checked }))
          }
        />
        Live AI corrections (Claude Haiku, batched)
      </label>
      <input
        className="w-full rounded-lg border border-border px-3 py-2"
        value={form.streaming_model}
        onChange={(event) => setForm((prev) => ({ ...prev, streaming_model: event.target.value }))}
        placeholder="Streaming model"
      />
      <Button type="button" onClick={() => void save()}>
        Save live settings
      </Button>
      {message ? <p className="text-primary">{message}</p> : null}
    </div>
  );
}
