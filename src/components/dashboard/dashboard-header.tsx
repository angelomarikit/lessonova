"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { AccountMenu } from "@/components/dashboard/account-menu";
import { LessonCreditsIndicator } from "@/components/dashboard/lesson-credits-indicator";
import { DashboardRecordCta } from "@/components/dashboard/dashboard-record-cta";
import { cn } from "@/lib/utils";

export function DashboardHeader({
  profile,
  summary,
  sidebarCollapsed,
  onToggleSidebar,
  className,
}: {
  profile: { fullName: string; email: string };
  summary: { remainingCredits: number | null; trialTotal: number };
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-[4.25rem] shrink-0 items-center justify-between gap-3 border-b border-border bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          className="hidden rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground lg:inline-flex"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleSidebar}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
        <DashboardRecordCta className="hidden sm:inline-flex" />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <LessonCreditsIndicator
          remainingCredits={summary.remainingCredits}
          trialTotal={summary.trialTotal}
        />
        <AccountMenu fullName={profile.fullName} email={profile.email} />
      </div>
    </header>
  );
}
