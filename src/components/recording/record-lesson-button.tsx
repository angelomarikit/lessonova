"use client";

import type { ComponentProps } from "react";

import { useRecordLesson } from "@/components/recording/record-lesson-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RecordLessonButton({
  className,
  studentId,
  children,
  size,
  variant,
  onOpened,
  ...props
}: {
  className?: string;
  studentId?: string | null;
  children: React.ReactNode;
  size?: ComponentProps<typeof import("@/components/ui/button").Button>["size"];
  variant?: ComponentProps<typeof import("@/components/ui/button").Button>["variant"];
  onOpened?: () => void;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type">) {
  const { openRecord } = useRecordLesson();

  return (
    <button
      type="button"
      className={cn(buttonVariants({ size, variant }), className)}
      onClick={() => {
        void openRecord(studentId ?? null);
        onOpened?.();
      }}
      {...props}
    >
      {children}
    </button>
  );
}
