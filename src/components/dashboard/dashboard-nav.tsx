"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", live: true },
  { label: "Record Lesson", href: "/dashboard/record", live: true },
  { label: "My Students", href: "/dashboard/students", live: true },
  { label: "Lesson History", href: "/dashboard/lessons", live: true },
  { label: "AI Reports", href: "/dashboard/reports", live: false },
  { label: "Progress Analytics", href: "/dashboard/analytics", live: false },
  { label: "Subscription", href: "/dashboard/subscription", live: false },
  { label: "Billing", href: "/dashboard/billing", live: false },
  { label: "Settings", href: "/dashboard/settings", live: false },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded-xl px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/10 font-semibold text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
            {!item.live ? (
              <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground/80">
                Soon
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
