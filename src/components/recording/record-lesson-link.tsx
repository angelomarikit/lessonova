"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { useRecordLesson } from "@/components/recording/record-lesson-provider";
import { cn } from "@/lib/utils";

export function RecordLessonLink({
  className,
  children,
  studentId,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { studentId?: string | null }) {
  const { openRecord } = useRecordLesson();

  return (
    <Link
      href="/dashboard"
      className={cn(className)}
      onClick={(event) => {
        event.preventDefault();
        void openRecord(studentId ?? null);
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
