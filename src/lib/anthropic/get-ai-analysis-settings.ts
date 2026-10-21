import {
  CLAUDE_TEST_LIMITS,
  getAnthropicModel,
  isClaudeTestMode,
} from "@/lib/anthropic/config";
import { resolveAutomaticAnalysisEnabled } from "@/lib/anthropic/resolve-automatic-analysis";
import { createServiceClient } from "@/lib/supabase/service";

export type AiAnalysisSettings = {
  defaultModel: string;
  automaticAnalysisEnabled: boolean;
  maxInputTokens: number;
  maxOutputTokens: number;
  regenerationAllowed: boolean;
  testModeBudgetUsd: number;
};

export const DEFAULT_AI_ANALYSIS_SETTINGS: AiAnalysisSettings = {
  defaultModel: getAnthropicModel(),
  automaticAnalysisEnabled: false,
  maxInputTokens: isClaudeTestMode()
    ? CLAUDE_TEST_LIMITS.maxInputTokens
    : 12_000,
  maxOutputTokens: isClaudeTestMode()
    ? CLAUDE_TEST_LIMITS.maxOutputTokens
    : 4_096,
  regenerationAllowed: !isClaudeTestMode(),
  testModeBudgetUsd: CLAUDE_TEST_LIMITS.devBudgetUsd,
};

const SETTINGS_ROW_ID = "00000000-0000-0000-0000-000000000002";

export async function getAiAnalysisSettings(): Promise<AiAnalysisSettings> {
  const fallback = DEFAULT_AI_ANALYSIS_SETTINGS;
  const supabase = createServiceClient();
  if (!supabase) {
    return fallback;
  }

  const { data, error } = await supabase
    .from("platform_ai_analysis_settings")
    .select(
      "default_model, automatic_analysis_enabled, max_input_tokens, max_output_tokens, regeneration_allowed, test_mode_budget_usd",
    )
    .eq("id", SETTINGS_ROW_ID)
    .maybeSingle();

  if (error || !data) {
    return fallback;
  }

  const storedInput = Number(data.max_input_tokens ?? fallback.maxInputTokens);
  const storedOutput = Number(data.max_output_tokens ?? fallback.maxOutputTokens);
  const merged: AiAnalysisSettings = {
    defaultModel: data.default_model?.trim() || fallback.defaultModel,
    automaticAnalysisEnabled: Boolean(data.automatic_analysis_enabled),
    // Old test-mode rows stored 3000/800, which truncates the report JSON and wastes credits.
    maxInputTokens: isClaudeTestMode() ? storedInput : Math.max(storedInput, 12_000),
    maxOutputTokens: isClaudeTestMode() ? storedOutput : Math.max(storedOutput, 4_096),
    regenerationAllowed: isClaudeTestMode() ? Boolean(data.regeneration_allowed) : true,
    testModeBudgetUsd: Number(data.test_mode_budget_usd ?? fallback.testModeBudgetUsd),
  };

  return {
    ...merged,
    automaticAnalysisEnabled: resolveAutomaticAnalysisEnabled(merged),
  };
}

export { SETTINGS_ROW_ID as AI_ANALYSIS_SETTINGS_ROW_ID };
