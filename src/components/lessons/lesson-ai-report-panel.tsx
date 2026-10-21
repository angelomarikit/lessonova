"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { LessonAiReport } from "@/lib/anthropic/lesson-report-schema";
import { googlePronunciationSearchUrl } from "@/lib/lessons/google-pronunciation-url";

type ReportMeta = {
  id: string;
  status: string;
  approval_status: string;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost_usd: number | null;
  error_message: string | null;
  generated_at: string | null;
};

export function LessonAiReportPanel({
  lessonId,
  hasTranscript,
  initialReport,
  initialEditedReport,
  reportMeta,
  testMode,
  regenerationAllowed,
  testBudgetUsd,
  testBudgetUsedUsd,
  anthropicConfigured,
}: {
  lessonId: string;
  hasTranscript: boolean;
  initialReport: LessonAiReport | null;
  initialEditedReport: LessonAiReport | null;
  reportMeta: ReportMeta | null;
  testMode: boolean;
  regenerationAllowed: boolean;
  testBudgetUsd: number;
  testBudgetUsedUsd: number;
  anthropicConfigured: boolean;
}) {
  const router = useRouter();
  const [report, setReport] = useState<LessonAiReport | null>(
    initialEditedReport ?? initialReport,
  );
  const [meta, setMeta] = useState<ReportMeta | null>(reportMeta);
  const [editing, setEditing] = useState(false);
  const [draftJson, setDraftJson] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmTest, setConfirmTest] = useState(!testMode);

  const isApproved = meta?.approval_status === "approved";

  const estimatedWarning = useMemo(() => {
    if (!testMode) {
      return "This sends one Claude request using your server API key.";
    }
    return `Test mode: ~800 max output tokens, ~3,000 input token cap, $${testBudgetUsd.toFixed(2)} app-side budget (used ~$${testBudgetUsedUsd.toFixed(4)} estimated). Not a billing guarantee.`;
  }, [testMode, testBudgetUsd, testBudgetUsedUsd]);

  async function generateReport() {
    setLoading("generate");
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/lessons/${lessonId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmTestCost: true,
          forceRegenerate: true,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        report?: LessonAiReport;
        inputTokens?: number;
        outputTokens?: number;
        estimatedCostUsd?: number;
        model?: string;
      };

      if (!response.ok || !payload.ok || !payload.report) {
        setError(payload.message ?? "Could not generate AI report.");
        return;
      }

      setReport(payload.report);
      setMeta({
        id: meta?.id ?? "new",
        status: "ready",
        approval_status: "draft",
        model: payload.model ?? null,
        input_tokens: payload.inputTokens ?? null,
        output_tokens: payload.outputTokens ?? null,
        estimated_cost_usd: payload.estimatedCostUsd ?? null,
        error_message: null,
        generated_at: new Date().toISOString(),
      });
      setMessage(
        `Report generated. Tokens in/out: ${payload.inputTokens ?? "?"}/${payload.outputTokens ?? "?"} · est. $${(payload.estimatedCostUsd ?? 0).toFixed(4)}`,
      );
      router.refresh();
    } catch {
      setError("Could not reach the analysis service.");
    } finally {
      setLoading(null);
    }
  }

  async function saveDraft() {
    if (!report) {
      return;
    }
    setLoading("save");
    setError(null);
    try {
      let parsed: LessonAiReport = report;
      if (editing && draftJson) {
        parsed = JSON.parse(draftJson) as LessonAiReport;
      }
      const response = await fetch(`/api/lessons/${lessonId}/ai-report`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_draft", editedReport: parsed }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not save draft.");
        return;
      }
      setReport(parsed);
      setEditing(false);
      setMessage("Draft saved.");
      router.refresh();
    } catch {
      setError("Invalid JSON or network error while saving.");
    } finally {
      setLoading(null);
    }
  }

  async function approveReport() {
    if (!report) {
      return;
    }
    setLoading("approve");
    setError(null);
    try {
      const response = await fetch(`/api/lessons/${lessonId}/ai-report`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", editedReport: report }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not approve report.");
        return;
      }
      setMeta((prev) =>
        prev
          ? { ...prev, approval_status: "approved", status: "approved" }
          : prev,
      );
      setMessage("Report approved. Private teacher notes stay out of the student-facing copy.");
      router.refresh();
    } catch {
      setError("Could not approve report.");
    } finally {
      setLoading(null);
    }
  }

  function startEdit() {
    if (!report) {
      return;
    }
    setDraftJson(JSON.stringify(report, null, 2));
    setEditing(true);
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">AI lesson report</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Generate structured ESL feedback from your saved transcript. Claude runs on the server only when
        you click below.
      </p>

      {!anthropicConfigured ? (
        <p className="mt-4 text-sm text-amber-800">
          Add a valid ANTHROPIC_API_KEY on the server to enable analysis.
        </p>
      ) : null}

      {testMode ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-900">{estimatedWarning}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          disabled={
            !hasTranscript ||
            !anthropicConfigured ||
            loading !== null ||
            isApproved ||
            (testMode && !confirmTest)
          }
          onClick={() => void generateReport()}
        >
          {loading === "generate" ? "Generating..." : "Generate AI Report"}
        </Button>
        {testMode ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={confirmTest}
              onChange={(event) => setConfirmTest(event.target.checked)}
            />
            I understand this uses paid Claude credits
          </label>
        ) : null}
        <Button variant="secondary" disabled title="PDF export connects in a later phase">
          Download PDF
        </Button>
        <Button variant="secondary" disabled title="Resend email connects in a later phase">
          Email Report
        </Button>
        <Button
          variant="secondary"
          disabled={!regenerationAllowed || !report || loading !== null}
          title={regenerationAllowed ? undefined : "Disabled during Claude test mode"}
        >
          Regenerate Report
        </Button>
      </div>

      {!hasTranscript ? (
        <p className="mt-3 text-sm text-muted-foreground">Transcribe the lesson before generating a report.</p>
      ) : null}

      {meta?.error_message ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{meta.error_message}</p>
      ) : null}

      {meta && report ? (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>Status: {meta.approval_status}</span>
            {meta.model ? <span>Model: {meta.model}</span> : null}
            {meta.estimated_cost_usd != null ? (
              <span>Est. cost: ${Number(meta.estimated_cost_usd).toFixed(4)}</span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={loading !== null || isApproved}
              onClick={() => (editing ? setEditing(false) : startEdit())}
            >
              {editing ? "Cancel edit" : "Edit feedback"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={loading !== null || isApproved}
              onClick={() => void saveDraft()}
            >
              Save Draft
            </Button>
            <Button
              size="sm"
              disabled={loading !== null || isApproved}
              onClick={() => void approveReport()}
            >
              Approve Report
            </Button>
          </div>

          {editing ? (
            <textarea
              className="min-h-[320px] w-full rounded-xl border border-border p-3 font-mono text-xs"
              value={draftJson}
              onChange={(event) => setDraftJson(event.target.value)}
            />
          ) : (
            <ReportSections report={report} showPrivateNotes={!isApproved} />
          )}
        </div>
      ) : null}

      {message ? <p className="mt-4 text-sm text-primary">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

function ReportSections({
  report,
  showPrivateNotes,
}: {
  report: LessonAiReport;
  showPrivateNotes: boolean;
}) {
  return (
    <div className="space-y-6 text-sm">
      <Section title="Lesson summary">
        <p>{report.lessonSummary.studentFacingSummary}</p>
        <TagList label="Topics" items={report.lessonSummary.topics} />
      </Section>

      <Section title="Pronunciation (American English)">
        {(report.pronunciationFeedback ?? []).length === 0 ? (
          <p className="text-muted-foreground">Nothing here yet.</p>
        ) : (
          <ul className="space-y-3">
            {(report.pronunciationFeedback ?? []).map((item) => (
              <li key={`${item.wordOrPhrase}-${item.studentQuote}`} className="rounded-xl border border-border p-3">
                <p>
                  <span className="font-semibold">{item.wordOrPhrase}</span> — {item.issue}
                </p>
                <p className="text-muted-foreground">Student: &quot;{item.studentQuote}&quot;</p>
                <p>American target: {item.americanTargetPronunciation}</p>
                <p className="text-muted-foreground">{item.practiceTip}</p>
                <a
                  href={googlePronunciationSearchUrl(item.wordOrPhrase)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-primary hover:underline"
                >
                  How to pronounce on Google →
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Speech & fluency (verbatim)">
        {(report.speechFluencyNotes ?? []).length === 0 ? (
          <p className="text-muted-foreground">Nothing here yet.</p>
        ) : (
          <ul className="space-y-2">
            {(report.speechFluencyNotes ?? []).map((item) => (
              <li key={`${item.note}-${item.evidenceQuote}`}>
                <p>{item.note}</p>
                <p className="text-muted-foreground">&quot;{item.evidenceQuote}&quot;</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Lesson focus areas">
        {(report.lessonFocusAreas ?? []).length === 0 ? (
          <p className="text-muted-foreground">Nothing here yet.</p>
        ) : (
          <ul className="space-y-2">
            {(report.lessonFocusAreas ?? []).map((item) => (
              <li key={`${item.area}-${item.summary}`}>
                <span className="font-semibold capitalize">{item.area}</span>: {item.summary}
                {item.evidenceQuote ? (
                  <p className="text-muted-foreground">&quot;{item.evidenceQuote}&quot;</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Grammar corrections">
        {report.grammarCorrections.length === 0 ? (
          <p className="text-muted-foreground">Nothing here yet.</p>
        ) : (
          <ul className="space-y-3">
            {report.grammarCorrections.map((item) => (
              <li key={`${item.originalStudentSentence}-${item.correctedSentence}`} className="rounded-xl border border-border p-3">
                <p>
                  <span className="font-medium">Student:</span> {item.originalStudentSentence}
                </p>
                <p>
                  <span className="font-medium">Correction:</span> {item.correctedSentence}
                </p>
                <p className="text-muted-foreground">{item.explanation}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Vocabulary">
        <ul className="space-y-2">
          {report.vocabulary.map((item) => (
            <li key={item.term}>
              <span className="font-semibold">{item.term}</span> — {item.meaning}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Student strengths">
        <TagList items={report.studentStrengths} />
      </Section>

      <Section title="Homework">
        <TagList label="Grammar" items={report.homework.grammarExercises} />
        <TagList label="Vocabulary" items={report.homework.vocabularyExercises} />
        <TagList label="Speaking" items={report.homework.speakingPracticeQuestions} />
      </Section>

      {showPrivateNotes && report.privateTeacherNotes.length > 0 ? (
        <Section title="Private teacher notes">
          <TagList items={report.privateTeacherNotes} />
        </Section>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function TagList({ label, items }: { label?: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
      {label ? <li className="list-none pl-0 font-medium text-foreground">{label}</li> : null}
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
