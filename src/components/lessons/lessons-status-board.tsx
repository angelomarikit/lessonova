import { CheckCircle2, PencilLine, Send } from "lucide-react";

import { LessonHistoryRow } from "@/components/lessons/lesson-history-row";
import type { LessonListRow } from "@/lib/lessons/lesson-feedback-buckets";

function StatusSection({
  title,
  description,
  count,
  tone,
  icon: Icon,
  lessons,
  emptyMessage,
}: {
  title: string;
  description: string;
  count: number;
  tone: "rose" | "sky" | "emerald";
  icon: typeof PencilLine;
  lessons: LessonListRow[];
  emptyMessage: string;
}) {
  const tones = {
    rose: {
      iconBg: "bg-rose-50 text-rose-500",
      badge: "bg-rose-100 text-rose-700",
      border: "border-l-rose-400",
    },
    sky: {
      iconBg: "bg-sky-50 text-sky-600",
      badge: "bg-sky-100 text-sky-700",
      border: "border-l-sky-400",
    },
    emerald: {
      iconBg: "bg-emerald-50 text-emerald-600",
      badge: "bg-emerald-100 text-emerald-700",
      border: "border-l-emerald-400",
    },
  }[tone];

  return (
    <section className="border-b border-border/80 py-8 last:border-b-0">
      <div className="flex flex-wrap items-start gap-3 px-1">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones.iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones.badge}`}>
              {count}
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>

      <div
        className={`mt-5 overflow-hidden rounded-2xl border border-border/80 border-l-[4px] bg-white shadow-sm ${tones.border}`}
      >
        {lessons.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          lessons.map((lesson) => (
            <LessonHistoryRow
              key={lesson.id}
              lesson={lesson}
              layout="history"
              accentClassName={
                lesson.studentName.toLowerCase() === "sample" ? "border-l-[#e85d5d]" : undefined
              }
            />
          ))
        )}
      </div>
    </section>
  );
}

export function LessonsStatusBoard({
  needsReview,
  confirmed,
  completed,
}: {
  needsReview: LessonListRow[];
  confirmed: LessonListRow[];
  completed: LessonListRow[];
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-[#fafbf9] px-4 py-2 shadow-sm sm:px-6">
      <StatusSection
        title="Needs review"
        description="Feedback is drafted and waiting for you to check it."
        count={needsReview.length}
        tone="rose"
        icon={PencilLine}
        lessons={needsReview}
        emptyMessage="Nothing waiting for review."
      />
      <StatusSection
        title="Confirmed"
        description="Reviewed and ready — not sent to the student yet."
        count={confirmed.length}
        tone="sky"
        icon={CheckCircle2}
        lessons={confirmed}
        emptyMessage="Nothing waiting to be sent."
      />
      <StatusSection
        title="Completed"
        description="Sent to the student."
        count={completed.length}
        tone="emerald"
        icon={Send}
        lessons={completed}
        emptyMessage="No lessons sent yet."
      />
    </div>
  );
}
