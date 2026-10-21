"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "#home", label: "Home" },
  { href: "#features", label: "Features" },
  { href: "#platforms", label: "Platforms" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQs" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:min-h-24 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center">
          <BrandLogo variant="header" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
            Log In
          </Link>
          <Link href="/register" className={cn(buttonVariants())}>
            Get Started
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex cursor-pointer items-center justify-center rounded-lg p-2 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          "border-t border-border bg-white md:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-4">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium uppercase tracking-wide text-foreground hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-4">
            <Link href="/login" className={cn(buttonVariants({ variant: "secondary" }))}>
              Log In
            </Link>
            <Link href="/register" className={cn(buttonVariants())}>
              Get Started
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
