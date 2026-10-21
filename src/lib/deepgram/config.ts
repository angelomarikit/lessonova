export const DEFAULT_DEEPGRAM_MODEL = "nova-3";

/** Rough Nova-3 batch estimate (USD/min); override via env for admin reporting only. */
export const DEEPGRAM_ESTIMATED_USD_PER_MINUTE = Number(
  process.env.DEEPGRAM_ESTIMATED_USD_PER_MINUTE ?? "0.0043",
);

export function getDeepgramApiKey(): string | undefined {
  return process.env.DEEPGRAM_API_KEY?.trim() || undefined;
}

export function isDeepgramConfigured(): boolean {
  return Boolean(getDeepgramApiKey());
}

export function getDeepgramModel(): string {
  return process.env.DEEPGRAM_MODEL?.trim() || DEFAULT_DEEPGRAM_MODEL;
}
