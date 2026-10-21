"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { RecordLessonLink } from "@/components/recording/record-lesson-link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { formatEnglishLevel, formatLearningGoal } from "@/lib/students/profile-options";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type StudentRow = {
  id: string;
  display_name: string;
  email: string | null;
  english_level: string | null;
  learning_objectives: string | null;
  is_active: boolean;
  created_at: string;
};

export function StudentsManager() {
  const searchParams = useSearchParams();
  const addedId = searchParams.get("added");

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [addedStudent, setAddedStudent] = useState<{ id: string; display_name: string } | null>(null);

  const filteredStudents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return students;
    }
    return students.filter((student) => {
      const haystack = [
        student.display_name,
        student.email,
        student.english_level,
        formatLearningGoal(student.learning_objectives),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, students]);

  async function loadStudents() {
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return;
      }
      const { data, error: fetchError } = await supabase
        .from("students")
        .select("id, display_name, email, english_level, learning_objectives, is_active, created_at")
        .eq("teacher_id", user.id)
        .order("display_name");
      if (fetchError) {
        setError(fetchError.message);
        return;
      }
      setStudents(data ?? []);
    } catch {
      setError("Apply the Phase 2 Supabase migration to enable student management.");
    }
  }

  useEffect(() => {
    void loadStudents();
  }, []);

  useEffect(() => {
    if (!addedId || students.length === 0) {
      return;
    }
    const match = students.find((student) => student.id === addedId);
    if (match) {
      setAddedStudent({ id: match.id, display_name: match.display_name });
    }
  }, [addedId, students]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Students"
        title="Everyone you're currently teaching"
        description={`${students.length} learner${students.length === 1 ? "" : "s"} on your roster`}
        actions={
          <>
            <RecordLessonLink className={cn(buttonVariants({ variant: "secondary" }), "rounded-xl")}>
              Record a lesson
            </RecordLessonLink>
            <Link href="/dashboard/students/new" className={cn(buttonVariants(), "rounded-xl")}>
              + Add student
            </Link>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, goal, level..."
            className="w-full rounded-full border border-border bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {addedStudent ? (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-4">
          <p className="font-semibold text-foreground">
            {addedStudent.display_name} was added to your roster.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">You can record a lesson whenever you are ready.</p>
          <RecordLessonLink
            studentId={addedStudent.id}
            className={cn(buttonVariants(), "mt-3 inline-flex")}
          >
            Record lesson for {addedStudent.display_name}
          </RecordLessonLink>
        </div>
      ) : null}

      <Card>
        <CardContent>
        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
        {students.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">No students yet.</p>
            <Link href="/dashboard/students/new" className={cn(buttonVariants(), "mt-4 inline-flex")}>
              + Add student
            </Link>
          </div>
        ) : filteredStudents.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No students match your search.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="pb-3 pr-4 font-semibold">Student</th>
                <th className="pb-3 pr-4 font-semibold">Level</th>
                <th className="pb-3 pr-4 font-semibold">Goal</th>
                <th className="pb-3 pr-4 font-semibold">Email</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
            {filteredStudents.map((student) => {
              const goalLabel = formatLearningGoal(student.learning_objectives);
              const isNew =
                Date.now() - new Date(student.created_at).getTime() < 1000 * 60 * 60 * 24 * 14 &&
                !student.english_level;
              return (
                <tr key={student.id} className="group hover:bg-muted/20">
                  <td className="py-4 pr-4">
                    <Link href={`/dashboard/students/${student.id}`} className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                        {student.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold group-hover:text-primary">{student.display_name}</span>
                          {isNew ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                              New
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="py-4 pr-4 text-muted-foreground">{formatEnglishLevel(student.english_level)}</td>
                  <td className="py-4 pr-4 text-muted-foreground">{goalLabel ?? "—"}</td>
                  <td className="py-4 pr-4 text-muted-foreground">{student.email ?? "—"}</td>
                  <td className="py-4">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                        student.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {student.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
