"use client";

import { RecordLessonLink } from "@/components/recording/record-lesson-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LessonsRecordLink() {
  return (
    <RecordLessonLink className={cn(buttonVariants())}>Record a lesson</RecordLessonLink>
  );
}
