import type { ReactNode } from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  LineChart,
  Mic,
  Sparkles,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { FallingLeaves } from "@/components/marketing/falling-leaves";
import { cn } from "@/lib/utils";

const highlights = [
  { icon: Mic, label: "Record lessons with consent-aware workflows" },
  { icon: Sparkles, label: "AI grammar and vocabulary feedback" },
  { icon: BookOpenCheck, label: "Branded reports students actually read" },
  { icon: LineChart, label: "Progress tracking across every student" },
];

export function AuthPageShell({
  title,
  description,
  sideEyebrow,
  sideTitle,
  children,
  footer,
}: {
  title: string;
  description: string;
  sideEyebrow: string;
  sideTitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-muted">
      <FallingLeaves />

      <div className="relative z-[2] mx-auto grid min-h-screen w-full max-w-7xl lg:grid-cols-2">
        <div className="flex flex-col items-center justify-center px-6 py-12 sm:px-10 lg:px-14">
          <Link href="/" className="mb-8 inline-flex cursor-pointer">
            <BrandLogo variant="auth" />
          </Link>

          <div className="shadow-soft w-full max-w-xl rounded-3xl border border-border bg-white/95 p-8 sm:max-w-2xl sm:p-10 lg:p-12">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Lessonova workspace
            </p>
            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">{description}</p>
            <div className="mt-10">{children}</div>
            <div className="mt-8">{footer}</div>
          </div>
        </div>

        <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(80,184,0,0.22),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(182,223,86,0.25),transparent_45%)]" />
          <div className="relative px-12 xl:px-16">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">{sideEyebrow}</p>
            <h2 className="mt-3 max-w-lg text-3xl font-bold leading-tight xl:text-4xl">{sideTitle}</h2>

            <ul className="mt-10 space-y-4">
              {highlights.map((item) => (
                <li
                  key={item.label}
                  className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 backdrop-blur-sm transition-colors hover:bg-white/90"
                >
                  <span className="inline-flex rounded-xl bg-primary/10 p-2 text-primary">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium leading-relaxed text-foreground">{item.label}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
              {[
                ["2", "Free lessons"],
                ["AI", "Lesson notes"],
                ["PH", "Peso billing"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/70 bg-white/75 p-3 text-center backdrop-blur-sm"
                >
                  <p className="text-lg font-bold text-primary">{value}</p>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function AuthFooterLink({
  children,
  href,
  className,
}: {
  children: ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("cursor-pointer font-semibold text-primary hover:underline", className)}>
      {children}
    </Link>
  );
}
