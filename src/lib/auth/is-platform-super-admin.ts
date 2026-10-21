import { createClient } from "@/lib/supabase/server";

export async function isPlatformSuperAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "platform_super_admin")
    .maybeSingle();

  return !error && Boolean(data);
}
