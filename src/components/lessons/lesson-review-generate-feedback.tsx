"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function LessonReviewGenerateFeedback({
  lessonId,
  hasTranscript,
  reportStatus,
  reportError,
  testMode,
  hasReportContent,
}: {
  lessonId: string;
  hasTranscript: boolean;
  reportStatus: string | null;
  reportError: string | null;
  testMode: boolean;
  hasReportContent: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmTest, setConfirmTest] = useState(!testMode);

  if (hasReportContent) {
    return null;
  }

  async function generate() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/lessons/${lessonId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmTestCost: true, forceRegenerate: true }),
      });
      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Could not generate lesson feedback.");
        return;
      }
      setMessage("Lesson feedback generated from your recording. Refreshing…");
      router.refresh();
    } catch {
      setError("Could not generate lesson feedback.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4">
      <p className="text-sm font-semibold text-amber-950">Lesson feedback not generated yet</p>
      <p className="mt-1 text-sm text-amber-900/90">
        {hasTranscript
          ? "Your recording is saved. Generate AI feedback from the transcript (including live speech with fillers and repetitions) so grammar, pronunciation, and fluency sections fill in."
          : "No transcript found for this lesson yet. Open Transcription & AI tools to transcribe the recording first."}
      </p>
      {reportError ? (
        <p className="mt-2 text-sm text-red-700">Last attempt: {reportError}</p>
      ) : null}
      {reportStatus === "generating" || reportStatus === "analyzing" ? (
        <p className="mt-2 text-sm text-amber-900">Analysis in progress…</p>
      ) : null}
      {hasTranscript ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            disabled={loading || (testMode && !confirmTest)}
            onClick={() => void generate()}
          >
            {loading ? "Generating…" : "Generate lesson feedback"}
          </Button>
          {testMode ? (
            <label className="flex items-center gap-2 text-xs text-amber-950">
              <input
                type="checkbox"
                checked={confirmTest}
                onChange={(event) => setConfirmTest(event.target.checked)}
              />
              I understand this uses Claude credits (test mode)
            </label>
          ) : null}
        </div>
      ) : (
        <a
          href={`/dashboard/lessons/${lessonId}`}
          className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
        >
          Transcribe this lesson →
        </a>
      )}
      {message ? <p className="mt-3 text-sm text-primary">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
