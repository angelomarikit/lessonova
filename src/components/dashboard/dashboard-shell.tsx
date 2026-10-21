"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AccountMenu } from "@/components/dashboard/account-menu";
import { BrandLogo } from "@/components/brand-logo";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardRecordCta } from "@/components/dashboard/dashboard-record-cta";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { LessonCreditsIndicator } from "@/components/dashboard/lesson-credits-indicator";
import { RecordLessonProvider } from "@/components/recording/record-lesson-provider";
import { cn } from "@/lib/utils";

const SIDEBAR_STORAGE_KEY = "lessonova.sidebar.collapsed";

export function DashboardShell({
  children,
  profile,
  summary,
}: {
  children: React.ReactNode;
  profile: {
    fullName: string;
    email: string;
  };
  summary: {
    remainingCredits: number | null;
    trialTotal: number;
  };
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (stored === "1") {
        setSidebarCollapsed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const credits = summary.remainingCredits ?? summary.trialTotal;
  const trialCreditsLabel =
    summary.remainingCredits != null
      ? `${Math.max(0, credits)} of ${summary.trialTotal} free trial lessons left`
      : `${summary.trialTotal} trial lessons after signup`;

  return (
    <RecordLessonProvider trialCreditsLabel={trialCreditsLabel}>
      <div className="min-h-screen bg-[#f7faf5]">
        <div className="flex min-h-screen w-full">
          <div
            className={cn(
              "hidden h-screen shrink-0 border-r border-border bg-white transition-[width] duration-200 ease-out motion-reduce:transition-none lg:sticky lg:top-0 lg:block",
              sidebarCollapsed ? "w-[72px]" : "w-[260px]",
            )}
          >
            <DashboardSidebar
              profile={profile}
              collapsed={sidebarCollapsed}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="border-b border-border bg-white lg:hidden">
              <div className="flex h-14 items-center justify-between gap-2 px-4">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Link href="/dashboard" className="shrink-0">
                    <BrandLogo variant="dashboard" />
                  </Link>
                  <DashboardRecordCta compact className="min-w-0 flex-1 sm:flex-none" onOpened={() => setMobileOpen(false)} />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    className="rounded-lg p-2"
                    aria-label={mobileOpen ? "Close menu" : "Open menu"}
                    onClick={() => setMobileOpen((value) => !value)}
                  >
                    {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-border/60 px-4 py-2">
                <LessonCreditsIndicator
                  remainingCredits={summary.remainingCredits}
                  trialTotal={summary.trialTotal}
                />
                <AccountMenu fullName={profile.fullName} email={profile.email} compact />
              </div>
            </header>

            <DashboardHeader
              className="hidden lg:flex"
              profile={profile}
              summary={summary}
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={toggleSidebar}
            />

            <div
              className={cn(
                "fixed inset-0 z-40 bg-black/30 lg:hidden",
                mobileOpen ? "block" : "hidden",
              )}
              onClick={() => setMobileOpen(false)}
            />
            <aside
              className={cn(
                "fixed inset-y-0 left-0 z-50 w-[260px] transform border-r border-border bg-white transition-transform duration-200 ease-out motion-reduce:transition-none lg:hidden",
                mobileOpen ? "translate-x-0" : "-translate-x-full",
              )}
            >
              <DashboardSidebar profile={profile} onNavigate={() => setMobileOpen(false)} />
            </aside>

            <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-8">{children}</main>

            <div
              className={cn(
                "pointer-events-none fixed bottom-6 z-20 hidden transition-[left] duration-200 ease-out motion-reduce:transition-none lg:block",
                sidebarCollapsed ? "left-[88px]" : "left-[276px]",
              )}
            >
              <DashboardRecordCta className="pointer-events-auto shadow-lg" />
            </div>
          </div>
        </div>
      </div>
    </RecordLessonProvider>
  );
}
