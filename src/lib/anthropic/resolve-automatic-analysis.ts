import { isAnthropicConfigured } from "@/lib/anthropic/config";
import type { AiAnalysisSettings } from "@/lib/anthropic/get-ai-analysis-settings";

/** Dev: generate lesson feedback automatically after transcription when Claude is configured. */
export function isDevAutoAnalysisEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }
  if (process.env.AUTO_AI_ANALYSIS === "false") {
    return false;
  }
  return isAnthropicConfigured();
}

export function resolveAutomaticAnalysisEnabled(settings: AiAnalysisSettings): boolean {
  if (settings.automaticAnalysisEnabled) {
    return true;
  }
  return isDevAutoAnalysisEnabled();
}
