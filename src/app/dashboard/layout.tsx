import { cache } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getTeacherRemainingCredits } from "@/lib/dashboard/get-teacher-credits";
import { requireSessionUser } from "@/lib/auth/get-session-user";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const getDashboardProfile = cache(async (userId: string, fallbackName: string, fallbackEmail: string) => {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();

  return {
    fullName: profile?.full_name || fallbackName,
    email: profile?.email || fallbackEmail,
  };
});

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseConfigured = getSupabaseEnv().isConfigured;

  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen bg-muted px-4 py-10">
        <main className="mx-auto max-w-3xl rounded-2xl border border-border bg-white p-6 shadow-sm">
          {children}
        </main>
      </div>
    );
  }

  const user = await requireSessionUser();
  const fallbackName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "Teacher";

  const [profile, remainingCredits] = await Promise.all([
    getDashboardProfile(user.id, fallbackName, user.email ?? ""),
    getTeacherRemainingCredits(user.id).catch(() => null),
  ]);

  return (
    <DashboardShell
      profile={profile}
      summary={{
        remainingCredits,
        trialTotal: 2,
      }}
    >
      {children}
    </DashboardShell>
  );
}
