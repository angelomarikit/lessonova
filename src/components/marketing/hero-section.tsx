"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

import { HeroMascotVideo } from "@/components/marketing/hero-mascot-video";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HeroSection() {
  return (
    <section id="home" className="relative overflow-hidden bg-muted pt-16 pb-20 sm:pt-20 sm:pb-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(80,184,0,0.12),transparent_45%)]" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            AI ESL teaching assistant
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
            Teach the Lesson. We&apos;ll Handle the Notes.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Lessonova is your AI-powered teaching assistant that records lessons, captures
            conversations, identifies grammar mistakes, generates personalized feedback, and helps
            track student progress — so you can focus on teaching.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
              Try 2 Lessons Free
            </Link>
            <a
              href="#how-it-works"
              className={cn(buttonVariants({ size: "lg", variant: "secondary" }))}
            >
              See How It Works
            </a>
          </div>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <HeroMascotVideo />
        </div>
      </div>
    </section>
  );
}
