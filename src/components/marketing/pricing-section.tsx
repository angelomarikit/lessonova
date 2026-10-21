"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { formatPhp, cn } from "@/lib/utils";
import type { SubscriptionPlan } from "@/types/database";

type BillingPeriod = "monthly" | "annual";

export function PricingSection({
  plans,
  source,
}: {
  plans: SubscriptionPlan[];
  source: "database" | "fallback";
}) {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.sort_order - b.sort_order),
    [plans],
  );

  return (
    <section id="pricing" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Pricing</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Simple plans in Philippine pesos
          </h2>
          <p className="mt-4 text-muted-foreground">
            Plan limits and prices are managed by Lessonova administrators. Amounts below come from
            {source === "database" ? " your live plan records." : " fallback placeholders until Supabase is connected."}
          </p>

          <div className="mt-6 inline-flex rounded-full border border-border bg-muted p-1">
            {(["monthly", "annual"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold capitalize transition-colors",
                  period === value ? "bg-white text-foreground shadow-sm" : "text-muted-foreground",
                )}
                onClick={() => setPeriod(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3 xl:grid-cols-5">
          {sortedPlans.map((plan) => (
            <article
              key={plan.id}
              className={cn(
                "flex flex-col rounded-2xl border bg-white p-5 shadow-sm",
                plan.slug === "professional"
                  ? "border-primary shadow-soft lg:scale-[1.02]"
                  : "border-border",
              )}
            >
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-2 min-h-10 text-sm text-muted-foreground">{plan.description}</p>
              <p className="mt-5 text-3xl font-bold tracking-tight">
                {formatPlanPrice(plan, period)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {plan.monthly_lesson_limit
                  ? `Up to ${plan.monthly_lesson_limit} lessons / month`
                  : "Custom lesson allocation"}
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={cn(buttonVariants({ variant: plan.slug === "school" ? "secondary" : "default" }), "mt-6 w-full")}
              >
                {plan.slug === "free-trial" ? "Try 2 Lessons Free" : "Get Started"}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatPlanPrice(plan: SubscriptionPlan, period: BillingPeriod): string {
  if (plan.is_custom_pricing) {
    return "Custom";
  }

  const amount =
    period === "monthly" ? plan.price_monthly_php : plan.price_annual_php ?? plan.price_monthly_php;

  if (amount === null) {
    return "Set in admin";
  }

  if (amount === 0) {
    return "₱0";
  }

  return `${formatPhp(amount)}${period === "monthly" ? "/mo" : "/yr"}`;
}
