"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Inline hint on the record wizard — full profile uses Add student on the Students page. */
export function StudentQuickAddForm({
  onOpenFullForm,
}: {
  onCreated?: (student: { id: string; display_name: string }) => void;
  onOpenFullForm?: () => void;
}) {
  if (onOpenFullForm) {
    return (
      <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm">
        <p className="font-semibold">Need a new student?</p>
        <p className="mt-1 text-muted-foreground">
          Add their goal, level, and native language on the Students page first.
        </p>
        <button type="button" className={cn(buttonVariants({ size: "sm" }), "mt-3")} onClick={onOpenFullForm}>
          Open add student
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm">
      <p className="font-semibold">New student</p>
      <p className="mt-1 text-muted-foreground">Add students with full details from your roster.</p>
      <Link href="/dashboard/students/new" className={cn(buttonVariants({ size: "sm" }), "mt-3 inline-flex")}>
        Add student with details
      </Link>
    </div>
  );
}
