import Link from "next/link";
import type { ReactNode } from "react";
import { Lock, Mail } from "lucide-react";

import { LessonReviewAutoGenerate } from "@/components/lessons/lesson-review-auto-generate";
import type { LessonReviewViewModel } from "@/lib/lessons/lesson-review-view-model";
import { formatLessonDate, formatLessonDuration } from "@/lib/lessons/lesson-feedback-buckets";

function AccentList({
  items,
  accentClass,
}: {
  items: string[];
  accentClass: string;
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className={`border-l-[3px] pl-3 text-sm leading-relaxed ${accentClass}`}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function TextBlock({ value }: { value: string }) {
  if (!value.trim()) {
    return <p className="text-sm text-muted-foreground">Nothing here yet.</p>;
  }
  return (
    <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
      {value}
    </div>
  );
}

export function LessonReviewFeedbackView({
  lessonId,
  studentName,
  lessonNumber,
  topicLabel,
  createdAt,
  durationSeconds,
  isTrialLesson,
  levelLabel,
  workflowStatus,
  view,
  lessonReferenceTranscript,
  hasTranscript,
  hasReportContent,
  reportStatus,
  reportError,
  anthropicConfigured,
  testMode,
}: {
  lessonId: string;
  studentName: string;
  lessonNumber: number;
  topicLabel: string;
  createdAt: string;
  durationSeconds: number | null;
  isTrialLesson: boolean;
  levelLabel: string;
  workflowStatus: "needs_review" | "confirmed" | "completed";
  view: LessonReviewViewModel;
  lessonReferenceTranscript: string;
  hasTranscript: boolean;
  hasReportContent: boolean;
  reportStatus: string | null;
  reportError: string | null;
  anthropicConfigured: boolean;
  testMode: boolean;
}) {
  const statusBadge =
    workflowStatus === "completed"
      ? { label: "Completed", className: "bg-emerald-50 text-emerald-700" }
      : workflowStatus === "confirmed"
        ? { label: "Confirmed", className: "bg-sky-50 text-sky-700" }
        : { label: "Needs review", className: "bg-rose-50 text-rose-600" };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/lessons"
          className="text-sm font-medium text-muted-foreground hover:text-primary"
        >
          ← Back to overview
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Review lesson feedback
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Edit, confirm, and send.</h1>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
            {studentName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Lesson {lessonNumber} · {topicLabel}
            </p>
            <p className="mt-1 text-lg font-semibold">{studentName}</p>
            <p className="text-sm text-muted-foreground">
              {formatLessonDate(createdAt)} · {formatLessonDuration(durationSeconds)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isTrialLesson ? (
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              Trial lesson
            </span>
          ) : null}
          <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
            {levelLabel}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge.className}`}>
            ● {statusBadge.label}
          </span>
        </div>
      </header>

      {!anthropicConfigured ? (
        <p className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Add ANTHROPIC_API_KEY on the server to generate structured lesson feedback from your
          recording.
        </p>
      ) : (
        <>
          <LessonReviewAutoGenerate
            lessonId={lessonId}
            enabled={hasTranscript && !hasReportContent}
          />
        </>
      )}

      <ReviewSubsection title="How this lesson went (from recording)">
        {lessonReferenceTranscript.trim() ? (
          <div className="max-h-72 overflow-y-auto rounded-xl border border-border bg-muted/15 px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
            {lessonReferenceTranscript}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No transcript yet. Finish saving the recording and run transcription to see how the
            lesson unfolded.
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Live and batch transcripts keep filler words and repeated words when available — not
          ellipsis placeholders.
        </p>
      </ReviewSubsection>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-8">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Mail className="h-4 w-4 text-primary" />
              Student feedback
            </div>
            <p className="mt-1 text-xs text-muted-foreground">For the student · shared as a PDF</p>
          </div>

          <ReviewSubsection title="New vocabulary">
            {view.vocabulary.length === 0 ? (
              <p className="text-sm text-muted-foreground">No vocabulary added yet.</p>
            ) : (
              <ul className="space-y-4">
                {view.vocabulary.map((item) => (
                  <li key={item.term} className="text-sm">
                    <p>
                      <span className="font-semibold">{item.term}</span> — {item.meaning}
                    </p>
                    <p className="mt-1 text-muted-foreground">{item.example}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-primary">
              <button type="button" className="hover:underline">
                + Add word
              </button>
              <button type="button" className="hover:underline">
                Generate meaning + example
              </button>
            </div>
          </ReviewSubsection>

          <ReviewSubsection title="Grammar">
            {view.grammar.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing here yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {view.grammar.map((item) => (
                  <li key={`${item.original}-${item.corrected}`}>
                    <p>{item.original}</p>
                    <p className="font-medium text-primary">{item.corrected}</p>
                    <p className="text-muted-foreground">{item.why}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-primary">
              <button type="button" className="hover:underline">
                + Add correction
              </button>
              <button type="button" className="hover:underline">
                Generate correction + why
              </button>
            </div>
          </ReviewSubsection>

          <ReviewSubsection title="Pronunciation (American English)">
            {view.pronunciation.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing here yet.</p>
            ) : (
              <ul className="space-y-4 text-sm">
                {view.pronunciation.map((item) => (
                  <li key={`${item.wordOrPhrase}-${item.studentQuote}`} className="rounded-xl border border-border p-3">
                    <p>
                      <span className="font-semibold">{item.wordOrPhrase}</span> — {item.issue}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Student said: &quot;{item.studentQuote}&quot;
                    </p>
                    <p className="mt-1">American target: {item.americanTarget}</p>
                    <p className="mt-1 text-muted-foreground">{item.practiceTip}</p>
                    <a
                      href={item.googlePronunciationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
                    >
                      How to pronounce on Google →
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-primary">
              <button type="button" className="hover:underline">
                + Add word
              </button>
              <button type="button" className="hover:underline">
                Generate IPA + tip
              </button>
            </div>
          </ReviewSubsection>

          <ReviewSubsection title="Speech &amp; fluency (verbatim)">
            {view.fluencyNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing here yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {view.fluencyNotes.map((item) => (
                  <li key={`${item.note}-${item.evidenceQuote}`} className="border-l-[3px] border-amber-400 pl-3">
                    <p>{item.note}</p>
                    <p className="mt-1 text-muted-foreground">&quot;{item.evidenceQuote}&quot;</p>
                  </li>
                ))}
              </ul>
            )}
          </ReviewSubsection>

          <ReviewSubsection title="Went well">
            <AccentList items={view.wentWell} accentClass="border-sky-400" />
          </ReviewSubsection>

          <ReviewSubsection title="Areas to improve">
            <AccentList items={view.areasToImprove} accentClass="border-amber-400" />
          </ReviewSubsection>

          <ReviewSubsection title="Homework">
            <TextBlock value={view.homework} />
          </ReviewSubsection>

          <ReviewSubsection title="Additional information">
            <TextBlock value={view.additionalInformation} />
          </ReviewSubsection>

          <p className="text-xs text-muted-foreground">+ Attach file · 0.0 of 2.0 MB</p>
        </section>

        <section className="space-y-8 lg:border-l lg:border-border lg:pl-8">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Tutor notes
            </div>
            <p className="mt-1 text-xs text-muted-foreground">For you — private, never sent.</p>
          </div>

          <ReviewSubsection title="Speaking time">
            {view.speakingStudentPercent != null && view.speakingTutorPercent != null ? (
              <div className="space-y-2">
                <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="bg-sky-300"
                    style={{ width: `${view.speakingStudentPercent}%` }}
                  />
                  <div
                    className="bg-sky-600"
                    style={{ width: `${view.speakingTutorPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Student {view.speakingStudentPercent}%</span>
                  <span>Tutor {view.speakingTutorPercent}%</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not calculated for this lesson yet.</p>
            )}
          </ReviewSubsection>

          {view.observedLevel ? (
            <ReviewSubsection title="Observed level">
              <span className="inline-flex rounded-lg bg-muted px-3 py-1 text-sm font-semibold">
                {view.observedLevel}
              </span>
              <p className="mt-2 text-xs text-muted-foreground">
                One data point toward their level — not a final placement.
              </p>
            </ReviewSubsection>
          ) : null}

          <ReviewSubsection title="Focus areas (grammar, pronunciation, vocabulary, fluency)">
            {view.focusAreas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing here yet.</p>
            ) : (
              <AccentList items={view.focusAreas} accentClass="border-sky-400" />
            )}
          </ReviewSubsection>

          <ReviewSubsection title="Where the lesson ended">
            <TextBlock value={view.whereLessonEnded} />
          </ReviewSubsection>

          <ReviewSubsection title="Suggestions for next lesson">
            <AccentList items={view.nextLessonSuggestions} accentClass="border-sky-400" />
            <button type="button" className="mt-3 text-xs font-semibold text-primary hover:underline">
              + Add
            </button>
          </ReviewSubsection>

          <ReviewSubsection title="Prep notes">
            <TextBlock value={view.prepNotes} />
          </ReviewSubsection>
        </section>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <Link
          href={`/dashboard/lessons/${lessonId}`}
          className="text-sm font-semibold text-primary hover:underline"
        >
          Transcription & AI tools
        </Link>
      </div>
    </div>
  );
}

function ReviewSubsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-border pb-6 last:border-b-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}
