import Link from "next/link";
import { AlertCircle, BookOpen, Coins, Sparkles, Users } from "lucide-react";

import { KpiStatCard } from "@/components/dashboard/kpi-stat-card";
import { OverviewGreeting } from "@/components/dashboard/overview-greeting";
import { RecordLessonLink } from "@/components/recording/record-lesson-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireSessionUser } from "@/lib/auth/get-session-user";
import { getTeacherDashboardSummary } from "@/lib/dashboard/get-teacher-dashboard-summary";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireSessionUser();
  const fullName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "Teacher";

  let summary = {
    studentCount: 0,
    lessonsThisWeek: 0,
    draftsToReview: 0,
    readyForReview: 0,
    failedLessons: 0,
    remainingCredits: null as number | null,
    recentStudents: [] as { id: string; display_name: string }[],
    awaitingLessons: [] as Awaited<ReturnType<typeof getTeacherDashboardSummary>>["awaitingLessons"],
  };

  try {
    summary = await getTeacherDashboardSummary(user.id);
  } catch {
    // Migration not applied yet.
  }

  const creditsDisplay =
    summary.remainingCredits != null ? Math.max(0, summary.remainingCredits) : 2;
  const completedReports = summary.readyForReview + summary.draftsToReview;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <OverviewGreeting name={fullName.split(" ")[0] ?? fullName} />
        <div className="flex flex-wrap gap-2">
          <RecordLessonLink className={cn(buttonVariants({ size: "lg" }), "rounded-xl shadow-sm")}>
            Record new lesson
          </RecordLessonLink>
          <Link href="/dashboard/students/new" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "rounded-xl")}>
            Add student
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/15 bg-white px-5 py-4 text-sm leading-relaxed text-muted-foreground shadow-sm">
        Some days are slow. Progress still counts when it&apos;s quiet — every recorded lesson helps you build
        clearer feedback for your students.
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard label="Total students" value={summary.studentCount} hint="Active on your roster" icon={Users} />
        <KpiStatCard
          label="Lessons this week"
          value={summary.lessonsThisWeek}
          hint="Recorded sessions"
          icon={BookOpen}
        />
        <KpiStatCard
          label="Reports in pipeline"
          value={completedReports}
          hint={`${summary.readyForReview} ready · ${summary.draftsToReview} processing`}
          icon={Sparkles}
        />
        <KpiStatCard
          label="Lesson credits"
          value={creditsDisplay}
          hint={
            summary.remainingCredits != null
              ? "Remaining on your account"
              : "Trial allocation after signup"
          }
          icon={Coins}
        />
      </section>

      {summary.failedLessons > 0 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {summary.failedLessons} lesson{summary.failedLessons === 1 ? "" : "s"} need attention.{" "}
            <Link href="/dashboard/lessons" className="font-semibold underline">
              Review lesson history
            </Link>
          </p>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Awaiting you</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Lessons that need review or are still processing</p>
            </div>
            <Link href="/dashboard/lessons" className="text-sm font-semibold text-primary hover:underline">
              All lessons
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {summary.awaitingLessons.length === 0 ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                All caught up. New drafts and transcripts will appear here.
              </p>
            ) : (
              <ul className="space-y-2">
                {summary.awaitingLessons.map((lesson) => {
                  const studentName =
                    lesson.students && "display_name" in lesson.students
                      ? String(lesson.students.display_name)
                      : "Student";
                  return (
                    <li key={lesson.id} className="rounded-xl border border-border/80 bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{studentName}</p>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            {lesson.status.replaceAll("_", " ")}
                          </p>
                        </div>
                        <Link
                          href={`/dashboard/lessons/${lesson.id}`}
                          className="text-sm font-semibold text-primary hover:underline"
                        >
                          Open
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <RecordLessonLink className={cn(buttonVariants(), "w-full rounded-xl")}>Record lesson</RecordLessonLink>
              <Link
                href="/dashboard/students/new"
                className={cn(buttonVariants({ variant: "secondary" }), "w-full rounded-xl")}
              >
                Add student
              </Link>
              <Link
                href="/dashboard/settings#plan"
                className={cn(buttonVariants({ variant: "ghost" }), "w-full rounded-xl")}
              >
                View subscription
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Your students</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Recently added learners</p>
              </div>
              <Link href="/dashboard/students" className="text-sm font-semibold text-primary hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {summary.recentStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No students yet.{" "}
                  <Link href="/dashboard/students" className="font-semibold text-primary hover:underline">
                    Add your first
                  </Link>
                </p>
              ) : (
                <ul className="space-y-2">
                  {summary.recentStudents.map((student) => (
                    <li key={student.id}>
                      <Link
                        href={`/dashboard/students/${student.id}`}
                        className="block rounded-xl border border-border/80 px-3 py-2.5 text-sm font-medium transition hover:border-primary/40 hover:bg-muted/30"
                      >
                        {student.display_name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">Free trial · manual GCash / QR Ph billing</p>
              <p className="mt-2 font-display text-2xl font-bold">{creditsDisplay} credits left</p>
              <Link
                href="/dashboard/settings#plan"
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-4 rounded-xl")}
              >
                Manage plan
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
