"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Loader2 } from "lucide-react";

/** Dev/final-test: generate feedback as soon as review opens when transcript exists but report does not. */
export function LessonReviewAutoGenerate({
  lessonId,
  enabled,
}: {
  lessonId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const startedRef = useRef(false);
  const [status, setStatus] = useState<"idle" | "running" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || startedRef.current) {
      return;
    }
    startedRef.current = true;
    setStatus("running");

    void (async () => {
      const response = await fetch(`/api/lessons/${lessonId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmTestCost: true, forceRegenerate: true }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !payload.ok) {
        setStatus("failed");
        setError(payload.message ?? "Could not generate lesson feedback.");
        return;
      }
      router.refresh();
      setStatus("idle");
    })();
  }, [enabled, lessonId, router]);

  if (status === "failed" && error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </p>
    );
  }

  if (status !== "running") {
    return null;
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span>Generating lesson feedback from your transcript…</span>
    </div>
  );
}
