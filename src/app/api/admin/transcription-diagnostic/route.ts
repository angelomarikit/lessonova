import { NextResponse } from "next/server";

import { isPlatformSuperAdmin } from "@/lib/auth/is-platform-super-admin";
import { computeWordErrorRate } from "@/lib/recording/recording-audit";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isPlatformSuperAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    referenceText?: string;
    hypothesisText?: string;
  };

  const reference = body.referenceText?.trim() ?? "";
  const hypothesis = body.hypothesisText?.trim() ?? "";
  if (!reference || !hypothesis) {
    return NextResponse.json({ error: "Reference and hypothesis text are required." }, { status: 400 });
  }

  const metrics = computeWordErrorRate(reference, hypothesis);
  return NextResponse.json({
    ...metrics,
    note: "WER is a diagnostic aid only; live and batch engines may differ.",
  });
}
