"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, Search } from "lucide-react";
import { useMemo } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import type { RecordLessonPhase } from "@/components/recording/record-lesson-provider";
import { cn } from "@/lib/utils";

type StudentOption = { id: string; display_name: string };

function formatElapsed(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function ModalShell({
  children,
  onBackdropClick,
}: {
  children: React.ReactNode;
  onBackdropClick?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[#171C19]/20"
        onClick={onBackdropClick}
      />
      <div className="relative z-[201] w-full max-w-lg rounded-2xl border border-border bg-white p-6 shadow-2xl sm:p-8">
        {children}
      </div>
    </div>
  );
}

export function RecordLessonModal({
  open,
  phase,
  students,
  studentQuery,
  onStudentQueryChange,
  selectedStudent,
  trialLesson,
  onTrialLessonChange,
  trialCreditsLabel,
  elapsedMs,
  errorMessage,
  transcribeSkippedReason,
  lessonId,
  onCancel,
  onSelectStudent,
  onStopAndFile,
  onRecordAnother,
  onCloseFiled,
}: {
  open: boolean;
  phase: RecordLessonPhase;
  students: StudentOption[];
  studentQuery: string;
  onStudentQueryChange: (value: string) => void;
  selectedStudent: StudentOption | null;
  trialLesson: boolean;
  onTrialLessonChange: (value: boolean) => void;
  trialCreditsLabel: string;
  elapsedMs: number;
  errorMessage: string | null;
  transcribeSkippedReason: string | null;
  lessonId: string | null;
  onCancel: () => void;
  onSelectStudent: (student: StudentOption) => void;
  onStopAndFile: () => void;
  onRecordAnother: () => void;
  onCloseFiled: () => void;
}) {
  const filteredStudents = useMemo(() => {
    const needle = studentQuery.trim().toLowerCase();
    if (!needle) {
      return students;
    }
    return students.filter((student) => student.display_name.toLowerCase().includes(needle));
  }, [studentQuery, students]);

  if (!open) {
    return null;
  }

  if (phase === "requesting-media") {
    return (
      <ModalShell>
        <div className="flex flex-col items-center py-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 font-semibold">Allow microphone and share your classroom tab</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose the Meet or Zoom tab and turn on <strong>Share tab audio</strong> when Chrome asks.
          </p>
        </div>
      </ModalShell>
    );
  }

  if (phase === "recording") {
    return null;
  }

  if (phase === "uploading" && selectedStudent) {
    const firstName = selectedStudent.display_name.split(" ")[0] ?? selectedStudent.display_name;
    return (
      <ModalShell>
        <div className="flex flex-col items-center py-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 font-semibold">Saving {firstName}&apos;s lesson…</p>
          <p className="mt-2 text-xs text-red-600">Don&apos;t close this tab yet — the lesson isn&apos;t saved until this finishes.</p>
        </div>
      </ModalShell>
    );
  }

  if (phase === "transcribing" && selectedStudent) {
    const firstName = selectedStudent.display_name.split(" ")[0] ?? selectedStudent.display_name;
    return (
      <ModalShell>
        <div className="flex flex-col items-center py-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
          <p className="mt-4 font-display text-lg font-bold">Building {firstName}&apos;s feedback…</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Transcribing audio and generating lesson feedback — you&apos;ll land on the review page when
            this finishes.
          </p>
          <p className="mt-4 text-xs text-red-600">
            Don&apos;t close this tab yet — the lesson isn&apos;t saved until this finishes.
          </p>
        </div>
      </ModalShell>
    );
  }

  if (phase === "filed" && selectedStudent) {
    const name = selectedStudent.display_name;
    return (
      <ModalShell onBackdropClick={onCloseFiled}>
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <p className="mt-4 font-display text-xl font-bold uppercase tracking-wide">
            {name}&apos;s lesson is filed
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            We&apos;ve uploaded the audio
            {transcribeSkippedReason ? " — open the lesson to transcribe when ready." : " and prepared the transcript for review."}
          </p>
          {transcribeSkippedReason ? (
            <p className="mt-2 text-xs text-amber-800">{transcribeSkippedReason}</p>
          ) : null}
          <div className="mt-6 space-y-3">
            <Button type="button" className="w-full" onClick={onRecordAnother}>
              Record another lesson
            </Button>
            {lessonId ? (
              <Link
                href={`/dashboard/lessons/${lessonId}`}
                className={cn(buttonVariants({ variant: "secondary" }), "inline-flex w-full justify-center")}
                onClick={onCloseFiled}
              >
                Open lesson
              </Link>
            ) : null}
            <Button type="button" variant="secondary" className="w-full" onClick={onCloseFiled}>
              Close
            </Button>
          </div>
        </div>
      </ModalShell>
    );
  }

  if (phase === "error") {
    return (
      <ModalShell onBackdropClick={onCancel}>
        <p className="font-display text-xl font-bold uppercase tracking-wide">Record a lesson</p>
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage ?? "Something went wrong."}
        </p>
        <Button type="button" variant="secondary" className="mt-6 w-full" onClick={onCancel}>
          Close
        </Button>
      </ModalShell>
    );
  }

  return (
    <ModalShell onBackdropClick={onCancel}>
      <p className="font-display text-2xl font-bold uppercase tracking-wide">Record a lesson</p>
      <p className="mt-2 text-sm text-muted-foreground">Who is this lesson with?</p>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={studentQuery}
          onChange={(event) => onStudentQueryChange(event.target.value)}
          placeholder="Search students…"
          className="w-full rounded-full border border-border bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <ul className="mt-4 max-h-52 space-y-1 overflow-y-auto">
        {filteredStudents.length === 0 ? (
          <li className="py-6 text-center text-sm text-muted-foreground">
            {students.length === 0 ? (
              <>
                No students yet.{" "}
                <Link href="/dashboard/students/new" className="font-semibold text-primary hover:underline">
                  Add a student
                </Link>
              </>
            ) : (
              "No students match your search."
            )}
          </li>
        ) : (
          filteredStudents.map((student) => (
            <li key={student.id}>
              <button
                type="button"
                onClick={() => onSelectStudent(student)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-white",
                  selectedStudent?.id === student.id && "bg-white ring-1 ring-primary/30",
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-900">
                  {student.display_name.charAt(0).toUpperCase()}
                </span>
                <span className="font-medium">{student.display_name}</span>
              </button>
            </li>
          ))
        )}
      </ul>

      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={trialLesson}
          onChange={(event) => onTrialLessonChange(event.target.checked)}
          className="mt-1"
        />
        <span>This is a trial lesson — help fill in their profile</span>
      </label>
      <p className="mt-2 text-xs text-muted-foreground">{trialCreditsLabel}</p>

      {errorMessage ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>
      ) : null}

      <Button type="button" variant="secondary" className="mt-6 w-full" onClick={onCancel}>
        Cancel
      </Button>
    </ModalShell>
  );
}
