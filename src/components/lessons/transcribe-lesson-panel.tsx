"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function TranscribeLessonPanel({
  lessonId,
  canTranscribeClassroom,
  hasTeacherTranscript,
  deepgramConfigured,
}: {
  lessonId: string;
  canTranscribeClassroom: boolean;
  hasTeacherTranscript: boolean;
  deepgramConfigured: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"teacher" | "classroom" | "deepgram" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canRetryDeepgram, setCanRetryDeepgram] = useState(false);

  async function transcribe(
    source: "teacher_microphone" | "classroom_tab",
    options?: { provider?: "auto" | "deepinfra" | "deepgram" },
  ) {
    const provider = options?.provider ?? "auto";
    setLoading(
      provider === "deepgram"
        ? "deepgram"
        : source === "teacher_microphone"
          ? "teacher"
          : "classroom",
    );
    setMessage(null);
    setError(null);
    setCanRetryDeepgram(false);

    try {
      const response = await fetch(`/api/lessons/${lessonId}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          provider,
          allowFallback: false,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        testMode?: boolean;
        provider?: string;
        canRetryWithDeepgram?: boolean;
      };

      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Transcription failed.");
        if (payload.canRetryWithDeepgram && deepgramConfigured) {
          setCanRetryDeepgram(true);
        }
        return;
      }

      const providerLabel =
        payload.provider === "deepgram"
          ? "Deepgram"
          : payload.provider === "deepinfra"
            ? "DeepInfra Whisper"
            : "AI";

      setMessage(
        payload.testMode
          ? `Test transcription completed via ${providerLabel}. One paid request was used for this source.`
          : `Transcription completed via ${providerLabel}.`,
      );
      router.refresh();
    } catch {
      setError("Could not reach the transcription service.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">Transcription</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Primary provider is DeepInfra Whisper. Deepgram is available as a manual backup (automatic
        fallback stays off until a super admin enables it). Each click sends one server-side
        request.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          disabled={loading !== null}
          onClick={() => void transcribe("teacher_microphone", { provider: "auto" })}
        >
          {loading === "teacher" ? "Transcribing..." : "Transcribe with AI (primary)"}
        </Button>
        {deepgramConfigured ? (
          <Button
            variant="secondary"
            disabled={loading !== null}
            onClick={() => void transcribe("teacher_microphone", { provider: "deepgram" })}
          >
            {loading === "deepgram" ? "Transcribing..." : "Test with Deepgram (backup)"}
          </Button>
        ) : (
          <p className="w-full text-xs text-muted-foreground">
            Add DEEPGRAM_API_KEY on the server to enable Deepgram backup testing.
          </p>
        )}
        {hasTeacherTranscript ? (
          <p className="w-full text-xs text-muted-foreground">
            Teacher track transcript already saved. Test mode blocks duplicate primary requests unless
            you use Deepgram test or add a forced retry later.
          </p>
        ) : null}
        {canTranscribeClassroom ? (
          <Button
            variant="secondary"
            disabled={loading !== null}
            onClick={() => void transcribe("classroom_tab", { provider: "auto" })}
          >
            {loading === "classroom" ? "Transcribing..." : "Transcribe classroom track"}
          </Button>
        ) : null}
      </div>

      {canRetryDeepgram ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            Primary transcription failed. You can retry once with Deepgram (manual backup — no automatic
            charge from fallback).
          </p>
          <Button
            className="mt-3"
            variant="secondary"
            disabled={loading !== null}
            onClick={() => void transcribe("teacher_microphone", { provider: "deepgram" })}
          >
            Retry with Deepgram
          </Button>
        </div>
      ) : null}

      {message ? <p className="mt-4 text-sm text-primary">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
