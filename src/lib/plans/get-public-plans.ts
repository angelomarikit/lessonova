import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionPlan } from "@/types/database";

export const fallbackPlans: SubscriptionPlan[] = [
  {
    id: "fallback-free-trial",
    slug: "free-trial",
    name: "Free Trial",
    description: "Start with two AI-processed lessons.",
    monthly_lesson_limit: 2,
    trial_lessons: 2,
    is_custom_pricing: false,
    price_monthly_php: 0,
    price_annual_php: 0,
    features: ["2 AI-processed lessons", "Student management preview", "Dashboard access"],
    is_active: true,
    sort_order: 10,
  },
  {
    id: "fallback-starter",
    slug: "starter",
    name: "Starter",
    description: "For tutors getting consistent weekly bookings.",
    monthly_lesson_limit: 30,
    trial_lessons: null,
    is_custom_pricing: false,
    price_monthly_php: null,
    price_annual_php: null,
    features: ["Up to 30 lessons per month", "AI reports", "Student progress tracking"],
    is_active: true,
    sort_order: 20,
  },
  {
    id: "fallback-professional",
    slug: "professional",
    name: "Professional",
    description: "For active tutors with a full teaching schedule.",
    monthly_lesson_limit: 75,
    trial_lessons: null,
    is_custom_pricing: false,
    price_monthly_php: null,
    price_annual_php: null,
    features: ["Up to 75 lessons per month", "Priority processing queue", "Advanced analytics"],
    is_active: true,
    sort_order: 30,
  },
  {
    id: "fallback-pro",
    slug: "pro",
    name: "Pro",
    description: "For high-volume tutors and small teams.",
    monthly_lesson_limit: 130,
    trial_lessons: null,
    is_custom_pricing: false,
    price_monthly_php: null,
    price_annual_php: null,
    features: ["Up to 130 lessons per month", "Expanded report history", "Billing support"],
    is_active: true,
    sort_order: 40,
  },
  {
    id: "fallback-school",
    slug: "school",
    name: "School",
    description: "Custom allocation for language schools and academies.",
    monthly_lesson_limit: null,
    trial_lessons: null,
    is_custom_pricing: true,
    price_monthly_php: null,
    price_annual_php: null,
    features: [
      "Custom lesson allocation",
      "Multiple teachers",
      "Organization dashboard",
      "Shared usage management",
    ],
    is_active: true,
    sort_order: 50,
  },
];

export async function getPublicSubscriptionPlans(): Promise<{
  plans: SubscriptionPlan[];
  source: "database" | "fallback";
}> {
  try {
    if (!getSupabaseEnv().isConfigured) {
      return { plans: fallbackPlans, source: "fallback" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data?.length) {
      return { plans: fallbackPlans, source: "fallback" };
    }

    return { plans: data as SubscriptionPlan[], source: "database" };
  } catch {
    return { plans: fallbackPlans, source: "fallback" };
  }
}
