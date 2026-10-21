"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarClock, Plus, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LessonPlanItem } from "@/lib/students/lesson-plan";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-border/80 bg-[#FAFAF8] px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

function formatWhen(iso: string | null) {
  if (!iso) {
    return "Schedule open";
  }
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function StudentLessonPlanTimetable({
  studentId,
  items,
  tableMissing,
}: {
  studentId: string;
  items: LessonPlanItem[];
  tableMissing: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [focus, setFocus] = useState("");
  const [plan, setPlan] = useState("");
  const [when, setWhen] = useState("");
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addManual(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in.");
      setSaving(false);
      return;
    }
    const position = items.reduce((max, item) => Math.max(max, item.position), -1) + 1;
    const { error: insertError } = await supabase.from("student_lesson_plan_items").insert({
      teacher_id: user.id,
      student_id: studentId,
      position,
      title: title.trim(),
      focus: focus.trim(),
      plan: plan.trim(),
      scheduled_for: when ? new Date(when).toISOString() : null,
      source: "manual",
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setTitle("");
    setFocus("");
    setPlan("");
    setWhen("");
    setShowForm(false);
    router.refresh();
  }

  async function removeItem(id: string) {
    const supabase = getSupabaseBrowserClient();
    const { error: deleteError } = await supabase.from("student_lesson_plan_items").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.refresh();
  }

  async function suggest() {
    setSuggesting(true);
    setError(null);
    const response = await fetch(`/api/students/${studentId}/lesson-plan`, { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setSuggesting(false);
    if (!response.ok) {
      setError(payload.error ?? "Could not suggest a lesson plan.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-border/80 bg-white shadow-sm">
      <div className="border-b border-border/60 bg-gradient-to-r from-[#F4F9EF] via-white to-white px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Teaching roadmap</p>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">Lesson plan</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Plan upcoming sessions manually, or generate a sequence from this student&apos;s profile and lesson
              history.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full"
              onClick={() => setShowForm((value) => !value)}
            >
              <Plus className="h-4 w-4" />
              Add lesson
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              disabled={suggesting || tableMissing}
              onClick={() => void suggest()}
            >
              <Sparkles className="h-4 w-4" />
              {suggesting ? "Drafting…" : "AI suggest plan"}
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 sm:px-8">
        {tableMissing ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Run migration <code className="text-xs">20260321180000_student_lesson_plans.sql</code> in Supabase to
            save plans.
          </p>
        ) : null}
        {error ? (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : null}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
            <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-medium text-foreground">No lessons scheduled yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a row or use AI suggest to build the next few sessions.
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {items.map((item, index) => (
              <li
                key={item.id}
                className={cn(
                  "group relative rounded-2xl border border-border/70 bg-[#FAFAF8] p-4 transition hover:border-primary/30 hover:shadow-sm sm:p-5",
                  item.source === "ai" && "border-l-[3px] border-l-primary",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-primary shadow-sm">
                        {index + 1}
                      </span>
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      {item.source === "ai" ? (
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          AI draft
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {formatWhen(item.scheduledFor)}
                    </p>
                    {item.focus ? (
                      <p className="mt-3 text-sm">
                        <span className="font-medium text-foreground">Focus · </span>
                        <span className="text-muted-foreground">{item.focus}</span>
                      </p>
                    ) : null}
                    {item.plan ? (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.plan}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-muted-foreground opacity-0 transition hover:bg-white hover:text-red-600 group-hover:opacity-100"
                    aria-label="Remove lesson"
                    onClick={() => void removeItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}

        {showForm ? (
          <form
            onSubmit={(event) => void addManual(event)}
            className="mt-6 rounded-2xl border border-border/80 bg-white p-5 shadow-inner sm:p-6"
          >
            <p className="text-sm font-semibold">New lesson slot</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground">Title</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Past simple & shopping dialogues"
                  className={fieldClass}
                  required
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Date & time</span>
                <input
                  type="datetime-local"
                  value={when}
                  onChange={(event) => setWhen(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Focus</span>
                <input
                  value={focus}
                  onChange={(event) => setFocus(event.target.value)}
                  placeholder="Grammar, pronunciation, hobbies…"
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground">Lesson outline</span>
                <textarea
                  value={plan}
                  onChange={(event) => setPlan(event.target.value)}
                  placeholder="What you will teach and practice in class"
                  rows={3}
                  className={fieldClass}
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="submit" disabled={saving || tableMissing} className="rounded-full">
                {saving ? "Saving…" : "Save to timetable"}
              </Button>
              <Button type="button" variant="ghost" className="rounded-full" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}
