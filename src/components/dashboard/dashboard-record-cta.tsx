"use client";

import { Circle } from "lucide-react";

import { RecordLessonButton } from "@/components/recording/record-lesson-button";
import { cn } from "@/lib/utils";

const recordClassName =
  "gap-2.5 rounded-xl px-6 text-base font-bold shadow-md hover:brightness-95 sm:px-8";

export function DashboardRecordCta({
  className,
  onOpened,
  compact,
}: {
  className?: string;
  onOpened?: () => void;
  compact?: boolean;
}) {
  return (
    <RecordLessonButton
      size="lg"
      onOpened={onOpened}
      className={cn(recordClassName, compact ? "h-12 px-4 text-sm" : "h-14 min-w-[12rem]", className)}
    >
      <span className="relative flex h-3 w-3 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60 opacity-75 motion-reduce:animate-none" />
        <Circle className="relative h-3 w-3 fill-current" />
      </span>
      {compact ? "Record" : "Record a lesson"}
    </RecordLessonButton>
  );
}
