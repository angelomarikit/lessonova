export type AppRole =
  | "individual_tutor"
  | "school_owner"
  | "school_admin"
  | "school_teacher"
  | "platform_super_admin";

export type BillingInterval = "monthly" | "annual";

export interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  monthly_lesson_limit: number | null;
  trial_lessons: number | null;
  is_custom_pricing: boolean;
  price_monthly_php: number | null;
  price_annual_php: number | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}
