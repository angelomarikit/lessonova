import Link from "next/link";

import { PageHeader } from "@/components/dashboard/page-header";
import { requireSessionUser } from "@/lib/auth/get-session-user";
import { getTeacherDashboardSummary } from "@/lib/dashboard/get-teacher-dashboard-summary";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function DashboardSettingsPage() {
  const user = await requireSessionUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  let remainingCredits: number | null = null;
  try {
    const summary = await getTeacherDashboardSummary(user.id);
    remainingCredits = summary.remainingCredits;
  } catch {
    remainingCredits = null;
  }

  const fullName =
    profile?.full_name ||
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "Teacher");
  const email = profile?.email || user.email || "";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Account, billing, and preferences"
        description="Profile, subscription usage, and payment options for your teacher account."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
                {String(fullName).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{fullName}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="plan">
          <CardHeader>
            <CardTitle>Plan & usage</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Free trial with admin-managed plans and manual GCash / QR Ph billing coming in Phase 5.
            </p>
            <div className="mt-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              Free trial
            </div>
            <p className="mt-3 font-display text-2xl font-bold">
              {remainingCredits != null
                ? `${Math.max(0, remainingCredits)}`
                : "2"}{" "}
              <span className="text-base font-normal text-muted-foreground">lesson credits remaining</span>
            </p>
            <Link href="/#pricing" className={cn(buttonVariants({ variant: "secondary" }), "mt-4 inline-flex rounded-xl")}>
              View public pricing
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Manual payment verification (GCash / QR Ph) will appear here. PayMongo is planned for a later phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
