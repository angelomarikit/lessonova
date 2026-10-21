export type LessonFeedbackBucket = "needs_review" | "confirmed" | "completed";

export type LessonListRow = {
  id: string;
  status: string;
  recording_duration_seconds: number | null;
  created_at: string;
  studentName: string;
  reportApprovalStatus: string | null;
  reportStatus: string | null;
  lessonNumber: number;
  topicLabel: string;
};

export function bucketForLesson(row: {
  status: string;
  reportApprovalStatus: string | null;
}): LessonFeedbackBucket {
  if (row.status === "completed") {
    return "completed";
  }
  if (row.reportApprovalStatus === "approved") {
    return "confirmed";
  }
  if (
    row.status === "ready_for_review" ||
    row.status === "analyzing" ||
    row.status === "transcribing" ||
    row.reportApprovalStatus === "draft"
  ) {
    return "needs_review";
  }
  return "needs_review";
}

export function formatLessonDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatLessonDuration(seconds: number | null) {
  const total = Math.max(0, Math.round(seconds ?? 0));
  if (total === 0) {
    return "0 sec";
  }
  if (total < 60) {
    return `${total} sec`;
  }
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  if (remainder === 0) {
    return `${minutes} min`;
  }
  return `${minutes} min ${remainder} sec`;
}
