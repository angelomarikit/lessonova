import { createClient } from "@/lib/supabase/server";

/** Lightweight fetch for the dashboard shell header (avoids full summary on every navigation). */
export async function getTeacherRemainingCredits(
  teacherId: string,
): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("lesson_credit_ledger").select("delta").eq("user_id", teacherId);

  if (!data || data.length === 0) {
    return null;
  }
  return data.reduce((sum, row) => sum + Number(row.delta ?? 0), 0);
}
