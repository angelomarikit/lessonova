export const DEEPINFRA_WHISPER_MODEL = "openai/whisper-large-v3-turbo";

export const DEEPINFRA_WHISPER_ENDPOINT =
  "https://api.deepinfra.com/v1/inference/openai/whisper-large-v3-turbo";

export function getDeepInfraApiKey(): string | undefined {
  return process.env.DEEPINFRA_API_KEY?.trim() || undefined;
}

export function isDeepInfraConfigured(): boolean {
  return Boolean(getDeepInfraApiKey());
}

export function isDeepInfraTestMode(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEEPINFRA_TEST_MODE === "true"
  );
}

export const DEEPINFRA_TEST_LIMITS = {
  maxDurationSeconds: 60,
  maxFileBytes: 10 * 1024 * 1024,
} as const;
