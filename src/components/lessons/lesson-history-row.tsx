"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  formatLessonDate,
  formatLessonDuration,
  type LessonListRow,
} from "@/lib/lessons/lesson-feedback-buckets";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

export function LessonHistoryRow({
  lesson,
  layout = "history",
  accentClassName,
}: {
  lesson: LessonListRow | {
    id: string;
    created_at: string;
    recording_duration_seconds: number | null;
    topicLabel?: string;
    topic?: string;
    lessonNumber: number;
    studentName?: string;
  };
  layout?: "history" | "student";
  accentClassName?: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const topic =
    "topicLabel" in lesson && lesson.topicLabel
      ? lesson.topicLabel
      : "topic" in lesson && lesson.topic
        ? lesson.topic
        : "Lesson";
  const studentName = "studentName" in lesson ? lesson.studentName : undefined;
  const title = layout === "student" ? topic : (studentName ?? "Student");
  const subtitle =
    layout === "student"
      ? `Lesson ${lesson.lessonNumber} · ${formatLessonDuration(lesson.recording_duration_seconds)}`
      : `${topic} · Lesson ${lesson.lessonNumber} · ${formatLessonDuration(lesson.recording_duration_seconds)}`;

  const initial = (studentName ?? topic).charAt(0).toUpperCase();

  async function handleDelete(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (deleting) {
      return;
    }
    const confirmed = window.confirm(
      "Delete this lesson and its transcript? This cannot be undone.",
    );
    if (!confirmed) {
      return;
    }
    setDeleting(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("lessons").delete().eq("id", lesson.id);
    setDeleting(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div
      className={cn(
        "group flex items-stretch gap-2 border-b border-border/70 border-l-[3px] border-l-transparent bg-white last:border-b-0 sm:gap-3",
        accentClassName,
      )}
    >
      <Link
        href={`/dashboard/lessons/${lesson.id}/review`}
        className="flex min-w-0 flex-1 items-center gap-4 px-4 py-4 transition hover:bg-muted/40 sm:px-5 sm:py-5"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-primary/15 text-sm font-bold text-sky-800 ring-1 ring-sky-200/80">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold leading-snug text-foreground group-hover:text-primary">
            {title}
          </p>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 text-sm text-muted-foreground sm:flex">
          <span className="whitespace-nowrap font-medium">{formatLessonDate(lesson.created_at)}</span>
          <ChevronRight className="h-4 w-4 opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100 group-hover:text-primary" />
        </div>
      </Link>
      <div className="flex shrink-0 flex-col items-center justify-center gap-1 border-l border-border/60 px-2 py-3 sm:px-3">
        <span className="whitespace-nowrap text-[11px] font-medium text-muted-foreground sm:hidden">
          {formatLessonDate(lesson.created_at)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:bg-red-50 hover:text-red-600"
          aria-label="Delete lesson"
          disabled={deleting}
          onClick={handleDelete}
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
