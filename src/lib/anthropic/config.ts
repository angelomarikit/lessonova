export const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-5-5";

export function getAnthropicApiKey(): string | undefined {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key || key === "your_actual_anthropic_api_key") {
    return undefined;
  }
  return key;
}

export function isAnthropicConfigured(): boolean {
  return Boolean(getAnthropicApiKey());
}

export function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
}

/** Test mode only applies in local development. */
export function isClaudeTestMode(): boolean {
  return (
    process.env.NODE_ENV === "development" && process.env.CLAUDE_TEST_MODE === "true"
  );
}

/** Dev without CLAUDE_TEST_MODE: full token limits, no confirm checkbox, unlimited runs. */
export function isClaudeDevelopmentUnrestricted(): boolean {
  return process.env.NODE_ENV === "development" && !isClaudeTestMode();
}

export const CLAUDE_TEST_LIMITS = {
  maxInputTokens: Number(process.env.CLAUDE_TEST_MAX_INPUT_TOKENS ?? "3000"),
  maxOutputTokens: Number(process.env.CLAUDE_TEST_MAX_OUTPUT_TOKENS ?? "800"),
  /** Application-side guard — not a billing guarantee. */
  devBudgetUsd: Number(process.env.CLAUDE_TEST_DEV_BUDGET_USD ?? "1"),
} as const;

export const CLAUDE_PRICING = {
  inputUsdPerMillionTokens: Number(
    process.env.CLAUDE_INPUT_USD_PER_MTOK ?? "0.25",
  ),
  outputUsdPerMillionTokens: Number(
    process.env.CLAUDE_OUTPUT_USD_PER_MTOK ?? "1.25",
  ),
} as const;

export function estimateClaudeCostUsd(inputTokens: number, outputTokens: number): number {
  const input =
    (inputTokens / 1_000_000) * CLAUDE_PRICING.inputUsdPerMillionTokens;
  const output =
    (outputTokens / 1_000_000) * CLAUDE_PRICING.outputUsdPerMillionTokens;
  return Math.round((input + output) * 1_000_000) / 1_000_000;
}

/** Rough token estimate when pre-checking transcript size (≈4 chars per token). */
export function estimateTokensFromText(text: string): number {
  return Math.ceil(text.length / 4);
}
