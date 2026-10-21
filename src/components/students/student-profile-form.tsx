"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  ENGLISH_LEVEL_OPTIONS,
  LEARNING_GOAL_OPTIONS,
  buildStudentInsertRow,
  emptyStudentProfileInput,
  type StudentProfileInput,
} from "@/lib/students/profile-options";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const inputClassName =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-6 border-t border-border py-8 first:border-t-0 first:pt-0 lg:grid-cols-[minmax(0,220px)_1fr] lg:gap-10">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function FieldLabel({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="block text-xs leading-relaxed text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function StudentProfileForm({ mode }: { mode: "create" }) {
  const router = useRouter();
  const [form, setForm] = useState<StudentProfileInput>(emptyStudentProfileInput);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof StudentProfileInput>(key: K, value: StudentProfileInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be logged in.");
        return;
      }

      const row = buildStudentInsertRow(user.id, form);
      const { data, error: insertError } = await supabase
        .from("students")
        .insert(row)
        .select("id")
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      router.push(`/dashboard/students?added=${data.id}`);
      router.refresh();
    } catch {
      setError("Could not save student. Check Supabase migrations and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="pb-28">
      <div className="mb-6">
        <Link
          href="/dashboard/students"
          className="text-sm font-medium text-muted-foreground hover:text-primary"
        >
          ← All students
        </Link>
        <h1 className="mt-4 font-display text-3xl font-bold uppercase tracking-wide">Add a student</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Set up a profile so feedback is sharp from lesson one.
        </p>
      </div>

      {error ? <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="rounded-2xl border border-border bg-white px-5 py-2 shadow-sm sm:px-8">
        <FormSection title="The basics" description="Who they are and where reports go.">
          <FieldLabel label="Full name">
            <input
              required
              value={form.display_name}
              onChange={(event) => updateField("display_name", event.target.value)}
              placeholder="e.g. Maria Silva"
              className={inputClassName}
            />
          </FieldLabel>
          <FieldLabel
            label="Email"
            hint="Where lesson-report PDFs are sent. You can add this later."
          >
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="e.g. maria@email.com"
              className={inputClassName}
            />
          </FieldLabel>
          <FieldLabel label="Native language" hint="Helps anticipate common errors.">
            <input
              value={form.native_language}
              onChange={(event) => updateField("native_language", event.target.value)}
              placeholder="e.g. Portuguese (optional)"
              className={inputClassName}
            />
          </FieldLabel>
        </FormSection>

        <FormSection
          title="Level & goals"
          description="A starting guess — Lessonova confirms the real level after several taught lessons."
        >
          <FieldLabel label="Current level (CEFR)">
            <select
              value={form.english_level}
              onChange={(event) => updateField("english_level", event.target.value)}
              className={inputClassName}
            >
              {ENGLISH_LEVEL_OPTIONS.map((option) => (
                <option key={option.value || "empty"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel label="Primary goal">
            <select
              value={form.learning_objectives}
              onChange={(event) => updateField("learning_objectives", event.target.value)}
              className={inputClassName}
            >
              {LEARNING_GOAL_OPTIONS.map((option) => (
                <option key={option.value || "empty"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel label="Target exam">
            <input
              value={form.target_exam}
              onChange={(event) => updateField("target_exam", event.target.value)}
              placeholder="e.g. IELTS 7.5 (optional)"
              className={inputClassName}
            />
          </FieldLabel>
        </FormSection>

        <FormSection
          title="Teaching notes"
          description="Shapes the examples and focus in every report."
        >
          <FieldLabel
            label="Interests & topics"
            hint="Separate with commas — makes examples engaging."
          >
            <input
              value={form.interests}
              onChange={(event) => updateField("interests", event.target.value)}
              placeholder="cycling, podcasts, cooking"
              className={inputClassName}
            />
          </FieldLabel>
          <FieldLabel
            label="Areas to improve"
            hint="Separate with commas — your starting notes on weaknesses."
          >
            <input
              value={form.areas_to_improve}
              onChange={(event) => updateField("areas_to_improve", event.target.value)}
              placeholder="e.g. articles, pronunciation (optional)"
              className={inputClassName}
            />
          </FieldLabel>
          <FieldLabel
            label="Additional notes"
            hint="Private to you. Shown on the student's profile."
          >
            <textarea
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Optional. Anything from past lessons or another tutor — history, preferences, things to remember…"
              rows={4}
              className={cn(inputClassName, "resize-y")}
            />
          </FieldLabel>
        </FormSection>

        <FormSection title="Rate" description="Private to you.">
          <FieldLabel label="Hourly rate" hint="What you charge per hour.">
            <input
              inputMode="decimal"
              value={form.hourly_rate}
              onChange={(event) => updateField("hourly_rate", event.target.value)}
              placeholder="e.g. 25 (optional)"
              className={inputClassName}
            />
          </FieldLabel>
        </FormSection>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-white/95 px-4 py-4 backdrop-blur lg:pl-[280px]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-end gap-3 px-4 sm:px-8">
          <Link href="/dashboard/students" className={cn(buttonVariants({ variant: "secondary" }))}>
            Cancel
          </Link>
          <Button type="submit" disabled={loading || !form.display_name.trim()}>
            {loading ? "Saving…" : "Add student"}
          </Button>
        </div>
      </div>
    </form>
  );
}
