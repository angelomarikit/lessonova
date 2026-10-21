"use client";

import Link from "next/link";
import { ChevronDown, HelpCircle, LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const menuLinks = [
  { href: "/dashboard/settings", label: "My profile", icon: User },
  { href: "/dashboard/settings", label: "Account settings", icon: Settings },
  { href: "/dashboard/settings#plan", label: "Subscription & billing", icon: Settings },
  { href: "/dashboard/contact", label: "Help & support", icon: HelpCircle },
];

export function AccountMenu({
  fullName,
  email,
  compact,
}: {
  fullName: string;
  email: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const initial = fullName.charAt(0).toUpperCase() || "T";

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

  async function signOut() {
    setSigningOut(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex max-w-[220px] items-center gap-2 rounded-full border border-border bg-white py-1 pl-1 pr-2.5 text-left text-sm font-semibold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:max-w-none sm:pr-3"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
          {initial}
        </span>
        {!compact ? (
          <span className="hidden min-w-0 truncate sm:block">{fullName.split(" ")[0] ?? fullName}</span>
        ) : null}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,280px)] overflow-hidden rounded-2xl border border-border bg-white py-1 shadow-lg"
        >
          <div className="border-b border-border/60 px-4 py-3">
            <p className="truncate text-sm font-semibold">{fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          {menuLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              role="menuitem"
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden />
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            disabled={signingOut}
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2.5 border-t border-border/60 px-4 py-2.5 text-left text-sm text-red-700 transition hover:bg-red-50 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {signingOut ? "Signing out…" : "Log out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
