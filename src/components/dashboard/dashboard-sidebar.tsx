"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  GraduationCap,
  LayoutGrid,
  MessageCircle,
  Settings,
  Users,
} from "lucide-react";
import { useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  match?: (pathname: string) => boolean;
};

const workspaceNav: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutGrid,
    match: (pathname) => pathname === "/dashboard",
  },
  { href: "/dashboard/students", label: "My students", icon: Users },
  { href: "/dashboard/lessons", label: "Lesson history", icon: BookOpen },
];

const accountNav: NavItem[] = [
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const guideLinks = [
  { href: "/dashboard/guides#add-student", label: "Add a student" },
  { href: "/dashboard/guides#record-lesson", label: "Record a lesson" },
  { href: "/dashboard/guides#review-transcript", label: "Review transcript" },
  { href: "/dashboard/guides#track-progress", label: "Track progress" },
];

function NavLink({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const active = item.match
    ? item.match(pathname)
    : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      prefetch={true}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary/12 text-[#2d6a00] shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        collapsed && "justify-center px-2",
      )}
    >
      <item.icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")} />
      {!collapsed ? <span>{item.label}</span> : null}
    </Link>
  );
}

function SectionLabel({ children, collapsed }: { children: string; collapsed: boolean }) {
  if (collapsed) {
    return <div className="my-2 h-px bg-border/80" aria-hidden />;
  }
  return (
    <p className="mb-2 mt-5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80 first:mt-0">
      {children}
    </p>
  );
}

export function DashboardSidebar({
  profile,
  collapsed = false,
  onNavigate,
}: {
  profile: { fullName: string; email: string };
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [guidesOpen, setGuidesOpen] = useState(pathname.startsWith("/dashboard/guides"));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
        <Link
          href="/dashboard"
          className={cn("mb-4 inline-flex px-1", collapsed && "mx-auto")}
          onClick={onNavigate}
        >
          {collapsed ? (
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
              L
            </span>
          ) : (
            <BrandLogo variant="dashboard" />
          )}
        </Link>

        {!collapsed ? (
          <div className="mb-4 rounded-xl border border-border/80 bg-muted/40 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Workspace</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{profile.fullName}</p>
          </div>
        ) : null}

        <SectionLabel collapsed={collapsed}>Workspace</SectionLabel>
        <nav className="space-y-0.5">
          {workspaceNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </nav>

        <SectionLabel collapsed={collapsed}>Learning tools</SectionLabel>
        <nav className="space-y-0.5">
          <button
            type="button"
            title={collapsed ? "How-to guides" : undefined}
            onClick={() => {
              if (collapsed) {
                onNavigate?.();
                window.location.href = "/dashboard/guides";
                return;
              }
              setGuidesOpen((value) => !value);
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              pathname.startsWith("/dashboard/guides")
                ? "bg-primary/12 text-[#2d6a00]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-2",
            )}
          >
            <GraduationCap className="h-[18px] w-[18px] shrink-0" />
            {!collapsed ? <span className="flex-1 text-left">How-to guides</span> : null}
          </button>
          {!collapsed && guidesOpen ? (
            <div className="ml-2 space-y-0.5 border-l border-border pl-3">
              {guideLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onNavigate}
                  className="block rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/dashboard/guides"
                onClick={onNavigate}
                className="block px-2 py-1.5 text-xs font-semibold text-primary hover:underline"
              >
                All guides
              </Link>
            </div>
          ) : null}

          <Link
            href="/dashboard/contact"
            onClick={onNavigate}
            title={collapsed ? "Get in touch" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === "/dashboard/contact"
                ? "bg-primary/12 text-[#2d6a00]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-2",
            )}
          >
            <MessageCircle className="h-[18px] w-[18px] shrink-0" />
            {!collapsed ? <span>Get in touch</span> : null}
          </Link>
        </nav>

        <SectionLabel collapsed={collapsed}>Account</SectionLabel>
        <nav className="space-y-0.5">
          {accountNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      </div>
    </div>
  );
}
