import { NextResponse } from "next/server";

import {
  lessonReportSchema,
  stripPrivateTeacherNotes,
} from "@/lib/anthropic/lesson-report-schema";
import { getAiAnalysisSettings } from "@/lib/anthropic/get-ai-analysis-settings";
import { isClaudeTestMode } from "@/lib/anthropic/config";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    action: "save_draft" | "approve" | "send_to_student";
    editedReport?: unknown;
  };

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const { data: report } = await supabase
    .from("lesson_ai_reports")
    .select("id, report_json, edited_report_json, status")
    .eq("lesson_id", lessonId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (!report) {
    return NextResponse.json({ error: "No AI report found for this lesson." }, { status: 404 });
  }

  if (body.action === "save_draft") {
    const parsed = lessonReportSchema.safeParse(body.editedReport);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Edited report failed validation.", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("lesson_ai_reports")
      .update({
        edited_report_json: parsed.data,
        status: "ready",
        approval_status: "draft",
      })
      .eq("id", report.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, approvalStatus: "draft" });
  }

  if (body.action === "approve") {
    const source =
      body.editedReport != null
        ? lessonReportSchema.safeParse(body.editedReport)
        : lessonReportSchema.safeParse(report.edited_report_json ?? report.report_json);

    if (!source.success) {
      return NextResponse.json({ error: "Report content is invalid." }, { status: 400 });
    }

    const studentFacing = stripPrivateTeacherNotes(source.data);

    const { error } = await supabase
      .from("lesson_ai_reports")
      .update({
        edited_report_json: source.data,
        student_facing_json: studentFacing,
        approval_status: "approved",
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", report.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await supabase
      .from("lessons")
      .update({ status: "ready_for_review", error_message: null })
      .eq("id", lessonId);

    return NextResponse.json({ ok: true, approvalStatus: "approved" });
  }

  if (body.action === "send_to_student") {
    const { data: approvedReport } = await supabase
      .from("lesson_ai_reports")
      .select("approval_status")
      .eq("lesson_id", lessonId)
      .eq("teacher_id", user.id)
      .maybeSingle();

    if (approvedReport?.approval_status !== "approved") {
      return NextResponse.json(
        { error: "Confirm the report before sending it to the student." },
        { status: 400 },
      );
    }

    await supabase
      .from("lessons")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", lessonId);

    return NextResponse.json({ ok: true, lessonStatus: "completed" });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getAiAnalysisSettings();
  const service = createServiceClient();
  let budgetUsedUsd = 0;
  if (service && isClaudeTestMode()) {
    const { data } = await service
      .from("lesson_ai_usage_logs")
      .select("estimated_cost_usd")
      .eq("test_mode", true);
    budgetUsedUsd = (data ?? []).reduce(
      (sum, row) => sum + Number(row.estimated_cost_usd ?? 0),
      0,
    );
  }

  const { data: report } = await supabase
    .from("lesson_ai_reports")
    .select(
      "id, status, approval_status, model, report_json, edited_report_json, student_facing_json, input_tokens, output_tokens, estimated_cost_usd, error_message, generated_at, approved_at",
    )
    .eq("lesson_id", lessonId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    report,
    testMode: isClaudeTestMode(),
    regenerationAllowed: settings.regenerationAllowed && !isClaudeTestMode(),
    testBudgetUsd: settings.testModeBudgetUsd,
    testBudgetUsedUsd: budgetUsedUsd,
  });
}
