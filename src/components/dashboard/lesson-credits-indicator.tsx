"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LessonCreditsIndicator({
  remainingCredits,
  trialTotal,
}: {
  remainingCredits: number | null;
  trialTotal: number;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const credits = remainingCredits ?? trialTotal;
  const displayValue = Math.max(0, credits);
  const hasLedger = remainingCredits != null;
  const isLow = hasLedger && displayValue <= 1;
  const isEmpty = hasLedger && displayValue <= 0;

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        title="Lesson credits and subscription"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          isEmpty
            ? "border-amber-300 bg-amber-50 text-amber-950"
            : isLow
              ? "border-amber-200/80 bg-amber-50/90 text-amber-900"
              : "border-primary/20 bg-primary/10 text-[#2d6a00]",
        )}
      >
        <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          {displayValue} lesson{displayValue === 1 ? "" : "s"} left
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Lesson credits"
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,320px)] rounded-2xl border border-border bg-white p-4 shadow-lg"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan & usage</p>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">{displayValue}</p>
          <p className="text-sm text-muted-foreground">
            {hasLedger
              ? `Remaining lesson credits on your account.`
              : `${trialTotal} trial lessons included after signup.`}
          </p>
          {!hasLedger ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Credits appear here once your ledger is active in Supabase.
            </p>
          ) : null}
          {isEmpty ? (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
              You&apos;re out of credits. Renew or upgrade to record more lessons.
            </p>
          ) : null}
          <Link
            href="/dashboard/settings#plan"
            className={cn(buttonVariants({ size: "sm" }), "mt-4 w-full")}
            onClick={() => setOpen(false)}
          >
            View subscription
          </Link>
        </div>
      ) : null}
    </div>
  );
}
