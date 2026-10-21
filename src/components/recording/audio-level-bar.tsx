"use client";

import { cn } from "@/lib/utils";

export function AudioLevelBar({
  label,
  level,
  active,
  tone = "primary",
}: {
  label: string;
  level: number;
  active: boolean;
  tone?: "primary" | "lime";
}) {
  const width = `${Math.round(Math.min(1, Math.max(0, level)) * 100)}%`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className={active ? "text-primary" : "text-muted-foreground"}>
          {active ? "Detected" : "Waiting"}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-100",
            tone === "primary" ? "bg-primary" : "bg-accent-lime",
          )}
          style={{ width: active ? width : "0%" }}
        />
      </div>
    </div>
  );
}
