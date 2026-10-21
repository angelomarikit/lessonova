"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useRecordLesson } from "@/components/recording/record-lesson-provider";

function RecordLessonOpener() {
  const { openRecord } = useRecordLesson();
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = searchParams.get("student");

  useEffect(() => {
    void openRecord(studentId);
    router.replace("/dashboard");
  }, [openRecord, router, studentId]);

  return null;
}

/** Deep links open the record modal on the dashboard (no full-page wizard). */
export default function RecordLessonPage() {
  return (
    <Suspense fallback={null}>
      <RecordLessonOpener />
    </Suspense>
  );
}
