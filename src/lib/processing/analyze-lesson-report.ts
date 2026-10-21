import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import {
  estimateClaudeCostUsd,
  estimateTokensFromText,
  getAnthropicApiKey,
  getAnthropicModel,
  isAnthropicConfigured,
  isClaudeTestMode,
  CLAUDE_TEST_LIMITS,
} from "@/lib/anthropic/config";
import {
  computeTranscriptVersion,
  formatTranscriptForClaude,
} from "@/lib/anthropic/build-transcript-payload";
import { loadLessonTranscriptSegments } from "@/lib/lessons/load-lesson-transcript-segments";
import { getAiAnalysisSettings } from "@/lib/anthropic/get-ai-analysis-settings";
import {
  lessonReportSchema,
  type LessonAiReport,
} from "@/lib/anthropic/lesson-report-schema";
import { ESL_LESSON_ANALYSIS_SYSTEM_PROMPT } from "@/lib/anthropic/system-prompt";
import { createServiceClient } from "@/lib/supabase/service";

export class LessonAnalysisError extends Error {
  code: string;
  status: number;

  constructor(message: string, options: { code: string; status?: number }) {
    super(message);
    this.name = "LessonAnalysisError";
    this.code = options.code;
    this.status = options.status ?? 400;
  }
}

async function getDevBudgetConsumedUsd(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
): Promise<number> {
  const { data } = await supabase
    .from("lesson_ai_usage_logs")
    .select("estimated_cost_usd")
    .eq("test_mode", true);

  return (data ?? []).reduce((sum, row) => sum + Number(row.estimated_cost_usd ?? 0), 0);
}

export async function generateLessonAiReport(options: {
  lessonId: string;
  teacherId: string;
  confirmTestCost?: boolean;
  forceRegenerate?: boolean;
  /** Set when analysis runs right after transcription (server-initiated). */
  automaticAfterTranscription?: boolean;
}) {
  if (!isAnthropicConfigured()) {
    return {
      ok: false as const,
      code: "missing_api_key",
      message:
        "ANTHROPIC_API_KEY is not configured on the server. Add it to .env.local and restart the dev server.",
    };
  }

  const settings = await getAiAnalysisSettings();

  const autoRun =
    Boolean(options.automaticAfterTranscription) || Boolean(options.confirmTestCost);

  if (isClaudeTestMode() && !autoRun) {
    return {
      ok: false as const,
      code: "confirmation_required",
      message:
        "Claude test mode requires explicit confirmation before spending API credits.",
    };
  }

  if (isClaudeTestMode() && options.forceRegenerate) {
    return {
      ok: false as const,
      code: "regeneration_disabled",
      message: "Regeneration is disabled during Claude test mode.",
    };
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return {
      ok: false as const,
      code: "missing_service_role",
      message: "SUPABASE_SERVICE_ROLE_KEY is required for secure lesson analysis.",
    };
  }

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select(
      `
      id,
      teacher_id,
      student_id,
      organization_id,
      status,
      students(display_name, english_level, learning_objectives, notes)
    `,
    )
    .eq("id", options.lessonId)
    .eq("teacher_id", options.teacherId)
    .maybeSingle();

  if (lessonError || !lesson) {
    return { ok: false as const, code: "lesson_not_found", message: "Lesson not found." };
  }

  const transcriptSegments = await loadLessonTranscriptSegments(options.lessonId);
  if (transcriptSegments.length === 0) {
    return {
      ok: false as const,
      code: "transcript_missing",
      message: "Add a transcript before generating an AI report.",
    };
  }

  const transcriptVersion = computeTranscriptVersion(transcriptSegments);
  const transcriptText = formatTranscriptForClaude(transcriptSegments);
  const estimatedInputTokens = estimateTokensFromText(transcriptText);

  if (estimatedInputTokens > settings.maxInputTokens) {
    return {
      ok: false as const,
      code: "transcript_too_large",
      message: `Transcript is too large for the current limit (~${settings.maxInputTokens} tokens). Shorten the lesson or ask an admin to raise the limit.`,
    };
  }

  const { data: existingReport } = await supabase
    .from("lesson_ai_reports")
    .select("id, status, approval_status, transcript_version")
    .eq("lesson_id", options.lessonId)
    .maybeSingle();

  if (
    existingReport &&
    existingReport.transcript_version === transcriptVersion &&
    existingReport.approval_status === "approved" &&
    !options.forceRegenerate
  ) {
    return {
      ok: false as const,
      code: "report_already_approved",
      message: "An approved report already exists for this transcript version.",
    };
  }

  if (
    existingReport &&
    existingReport.transcript_version === transcriptVersion &&
    (existingReport.status === "ready" || existingReport.status === "draft") &&
    !options.forceRegenerate &&
    !options.automaticAfterTranscription
  ) {
    return {
      ok: false as const,
      code: "duplicate_generation",
      message:
        "A report already exists for this transcript. Edit the saved draft or wait until regeneration is enabled.",
    };
  }

  if (isClaudeTestMode()) {
    const budgetUsed = await getDevBudgetConsumedUsd(supabase);
    if (budgetUsed >= settings.testModeBudgetUsd) {
      return {
        ok: false as const,
        code: "dev_budget_exceeded",
        message: `Claude test budget (~$${settings.testModeBudgetUsd.toFixed(2)} estimated) is exhausted. This app-side guard is not a billing guarantee — also set limits in the Anthropic console.`,
        budgetUsedUsd: budgetUsed,
      };
    }

    const { count: testSuccessCount } = await supabase
      .from("lesson_ai_usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("test_mode", true)
      .eq("success", true);

    if ((testSuccessCount ?? 0) >= 1 && !options.forceRegenerate) {
      return {
        ok: false as const,
        code: "test_mode_limit",
        message:
          "Test mode allows one successful Claude analysis while testing. Review the saved report or reset usage in Supabase if you intentionally need another live test.",
      };
    }
  }

  const student =
    typeof lesson.students === "object" && lesson.students !== null
      ? (lesson.students as {
          display_name?: string;
          english_level?: string | null;
          learning_objectives?: string | null;
          notes?: string | null;
        })
      : null;

  const startedAt = Date.now();
  const model = settings.defaultModel || getAnthropicModel();

  await supabase
    .from("lessons")
    .update({ status: "analyzing", error_message: null })
    .eq("id", options.lessonId);

  const reportRowId = existingReport?.id;
  if (reportRowId) {
    await supabase
      .from("lesson_ai_reports")
      .update({
        status: "generating",
        error_message: null,
        model,
        transcript_version: transcriptVersion,
      })
      .eq("id", reportRowId);
  } else {
    await supabase.from("lesson_ai_reports").insert({
      lesson_id: options.lessonId,
      teacher_id: options.teacherId,
      student_id: lesson.student_id,
      organization_id: lesson.organization_id,
      status: "generating",
      approval_status: "draft",
      model,
      transcript_version: transcriptVersion,
    });
  }

  const userPrompt = [
    "Analyze this ESL lesson transcript for General American English teaching feedback.",
    "Preserve verbatim student wording in all quotes (including um, uh, repeated words, false starts, and pause markers).",
    student?.display_name ? `Student name: ${student.display_name}` : null,
    student?.english_level ? `English level: ${student.english_level}` : null,
    student?.learning_objectives
      ? `Learning objectives: ${student.learning_objectives}`
      : null,
    student?.notes ? `Teacher notes about student: ${student.notes}` : null,
    "",
    "Transcript:",
    transcriptText,
  ]
    .filter(Boolean)
    .join("\n");

  const client = new Anthropic({ apiKey: getAnthropicApiKey() });

  try {
    const message = await client.messages.parse({
      model,
      max_tokens: settings.maxOutputTokens,
      system: ESL_LESSON_ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      output_config: {
        format: zodOutputFormat(lessonReportSchema),
      },
    });

    const parsed = message.parsed_output;
    if (!parsed) {
      const stop = message.stop_reason ?? "unknown";
      throw new LessonAnalysisError(
        stop === "max_tokens"
          ? "The lesson report was cut off before it finished. Raise the output token limit and try again."
          : `Claude returned a response that could not be parsed (stop: ${stop}).`,
        {
          code: "malformed_output",
          status: 502,
        },
      );
    }

    const validated = lessonReportSchema.safeParse(parsed);
    if (!validated.success) {
      throw new LessonAnalysisError("Claude JSON did not pass schema validation.", {
        code: "malformed_output",
        status: 502,
      });
    }

    const inputTokens = message.usage.input_tokens;
    const outputTokens = message.usage.output_tokens;
    const estimatedCostUsd = estimateClaudeCostUsd(inputTokens, outputTokens);
    const processingDurationMs = Date.now() - startedAt;

    const { data: savedReport, error: saveError } = await supabase
      .from("lesson_ai_reports")
      .upsert(
        {
          lesson_id: options.lessonId,
          teacher_id: options.teacherId,
          student_id: lesson.student_id,
          organization_id: lesson.organization_id,
          status: "ready",
          approval_status: "draft",
          model,
          transcript_version: transcriptVersion,
          report_json: validated.data,
          edited_report_json: validated.data,
          error_message: null,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          estimated_cost_usd: estimatedCostUsd,
          processing_duration_ms: processingDurationMs,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "lesson_id" },
      )
      .select("id")
      .single();

    if (saveError) {
      throw new LessonAnalysisError(saveError.message, { code: "save_failed" });
    }

    await supabase
      .from("lessons")
      .update({
        status: "ready_for_review",
        analysis_cost_estimate: estimatedCostUsd,
        error_message: null,
      })
      .eq("id", options.lessonId);

    await supabase.from("lesson_ai_usage_logs").insert({
      lesson_id: options.lessonId,
      teacher_id: options.teacherId,
      report_id: savedReport?.id,
      model,
      success: true,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_usd: estimatedCostUsd,
      processing_duration_ms: processingDurationMs,
      test_mode: isClaudeTestMode(),
      metadata: {
        transcriptVersion,
        requestId: message.id,
      },
    });

    return {
      ok: true as const,
      reportId: savedReport?.id,
      report: validated.data as LessonAiReport,
      inputTokens,
      outputTokens,
      estimatedCostUsd,
      processingDurationMs,
      model,
      transcriptVersion,
    };
  } catch (error) {
    const messageText =
      error instanceof LessonAnalysisError
        ? error.message
        : error instanceof APIError
          ? mapAnthropicApiError(error)
          : error instanceof Error
            ? error.message
            : "Analysis failed.";

    const code =
      error instanceof LessonAnalysisError
        ? error.code
        : error instanceof APIError
          ? anthropicErrorCode(error)
          : "analysis_failed";

    await supabase
      .from("lesson_ai_reports")
      .upsert(
        {
          lesson_id: options.lessonId,
          teacher_id: options.teacherId,
          student_id: lesson.student_id,
          organization_id: lesson.organization_id,
          status: "failed",
          approval_status: "draft",
          model,
          transcript_version: transcriptVersion,
          error_message: messageText,
        },
        { onConflict: "lesson_id" },
      );

    await supabase
      .from("lessons")
      .update({
        status: "ready_for_review",
        error_message: messageText,
      })
      .eq("id", options.lessonId);

    await supabase.from("lesson_ai_usage_logs").insert({
      lesson_id: options.lessonId,
      teacher_id: options.teacherId,
      model,
      success: false,
      test_mode: isClaudeTestMode(),
      error_message: messageText,
      processing_duration_ms: Date.now() - startedAt,
      metadata: { code, transcriptVersion },
    });

    return {
      ok: false as const,
      code,
      message: messageText,
    };
  }
}

function anthropicErrorCode(error: APIError): string {
  if (error.status === 401) {
    return "invalid_api_key";
  }
  if (error.status === 402 || error.status === 403) {
    return "billing_or_credits";
  }
  if (error.status === 429) {
    return "rate_limited";
  }
  if (error.status === 404) {
    return "model_unavailable";
  }
  if (error.status === 400) {
    return "invalid_request";
  }
  if (error.status === 504 || error.status === 408) {
    return "timeout";
  }
  return "provider_error";
}

function mapAnthropicApiError(error: APIError): string {
  const code = anthropicErrorCode(error);
  if (code === "billing_or_credits") {
    return "Anthropic billing or credit limit blocked this request. Check your console account; your transcript is unchanged.";
  }
  if (code === "invalid_api_key") {
    return "Anthropic rejected the API key. Verify ANTHROPIC_API_KEY on the server.";
  }
  if (code === "rate_limited") {
    return "Anthropic rate limit reached. Wait a moment and try again manually.";
  }
  if (code === "model_unavailable") {
    return "The configured Claude model is unavailable. Check ANTHROPIC_MODEL.";
  }
  return error.message;
}
