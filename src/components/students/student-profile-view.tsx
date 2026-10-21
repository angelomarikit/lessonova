import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Mail,
  Sparkles,
  StickyNote,
  Target,
} from "lucide-react";

import { LessonHistoryRow } from "@/components/lessons/lesson-history-row";
import { StudentLessonPlanTimetable } from "@/components/students/student-lesson-plan-timetable";
import type { LessonPlanItem } from "@/lib/students/lesson-plan";
import { cn } from "@/lib/utils";

function ProfileCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border/80 bg-white p-5 shadow-sm sm:p-6", className)}>
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function StudentProfileView({
  student,
  lessonCount,
  wordsTaught,
  levelProgress,
  suggestedNext,
  profileRows,
  areasToImprove,
  interests,
  stillWorking,
  history,
  planItems,
  tableMissing,
}: {
  student: {
    id: string;
    display_name: string;
    email: string | null;
    notes: string | null;
    is_active: boolean;
  };
  lessonCount: number;
  wordsTaught: number;
  levelProgress: string;
  suggestedNext: string;
  profileRows: [string, string][];
  areasToImprove: string[];
  interests: string;
  stillWorking: string[];
  history: {
    id: string;
    created_at: string;
    recording_duration_seconds: number | null;
    topic: string;
    lessonNumber: number;
  }[];
  planItems: LessonPlanItem[];
  tableMissing: boolean;
}) {
  return (
    <div className="w-full space-y-8 pb-10">
      <Link
        href="/dashboard/students"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-primary"
      >
        ← All students
      </Link>

      <header className="overflow-hidden rounded-3xl border border-border/80 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-[#EEF8E4] via-white to-[#FAFAF8] px-6 py-8 sm:px-10 sm:py-10">
          <div className="flex flex-wrap items-start gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#3d9400] text-xl font-bold text-white shadow-md">
              {student.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Student profile</p>
              <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {student.display_name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-border/80 bg-white/80 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
                  {levelProgress}
                </span>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    student.is_active
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {student.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Lessons completed" value={lessonCount} />
        <StatTile label="Words in bank" value={wordsTaught} />
        <StatTile label="Level progress" value={levelProgress.split(" · ")[0] ?? levelProgress} sub={levelProgress} />
      </div>

      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-white to-white p-6 shadow-sm sm:p-7">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          <Sparkles className="h-4 w-4" />
          Suggested next
        </p>
        <p className="mt-3 text-base leading-relaxed text-foreground sm:text-lg">{suggestedNext}</p>
      </div>

      <StudentLessonPlanTimetable studentId={student.id} items={planItems} tableMissing={tableMissing} />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-4">
          <ProfileCard title="Profile" icon={GraduationCap}>
            <dl className="space-y-3">
              {profileRows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="text-right text-sm font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </ProfileCard>

          <ProfileCard title="Areas to improve" icon={Target}>
            {areasToImprove.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing saved on the profile yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {areasToImprove.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-900"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}
          </ProfileCard>

          <ProfileCard title="Interests & hobbies" icon={BookOpen}>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {interests || "Add interests when you edit the student to personalize AI lesson plans."}
            </p>
          </ProfileCard>

          <ProfileCard title="Email" icon={Mail}>
            <p className="text-sm font-medium">{student.email || "No email on file"}</p>
          </ProfileCard>

          <ProfileCard title="Private notes" icon={StickyNote}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {student.notes || "Your private teaching notes appear here."}
            </p>
          </ProfileCard>
        </div>

        <div className="space-y-6 lg:col-span-8">
          <ProfileCard title="Still working on">
            {stillWorking.length === 0 ? (
              <p className="text-sm text-muted-foreground">Insights from lesson feedback will appear here.</p>
            ) : (
              <ul className="space-y-2">
                {stillWorking.slice(0, 8).map((item) => (
                  <li
                    key={item}
                    className="flex items-start justify-between gap-3 rounded-xl bg-muted/25 px-4 py-3 text-sm"
                  >
                    <span className="leading-relaxed">{item}</span>
                    <span className="shrink-0 rounded-md bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                      Focus
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ProfileCard>

          <ProfileCard title="Lesson history">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recorded lessons yet.</p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm">
                {history.map((lesson) => (
                  <LessonHistoryRow
                    key={lesson.id}
                    layout="student"
                    lesson={{
                      id: lesson.id,
                      created_at: lesson.created_at,
                      recording_duration_seconds: lesson.recording_duration_seconds,
                      topic: lesson.topic,
                      lessonNumber: lesson.lessonNumber,
                    }}
                  />
                ))}
              </div>
            )}
          </ProfileCard>
        </div>
      </div>
    </div>
  );
}
