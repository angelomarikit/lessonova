"use client";

import { RecordLessonLink } from "@/components/recording/record-lesson-link";

export function GuidesRecordLink({ children }: { children: React.ReactNode }) {
  return (
    <RecordLessonLink className="font-semibold text-primary hover:underline">{children}</RecordLessonLink>
  );
}
