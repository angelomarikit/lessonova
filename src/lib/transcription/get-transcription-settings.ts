import { createServiceClient } from "@/lib/supabase/service";
import {
  DEFAULT_TRANSCRIPTION_SETTINGS,
  type TranscriptionPrimaryMode,
  type TranscriptionSettings,
} from "@/lib/transcription/types";

const SETTINGS_ROW_ID = "00000000-0000-0000-0000-000000000001";

function parsePrimaryMode(value: unknown): TranscriptionPrimaryMode {
  if (
    value === "deepinfra_primary" ||
    value === "deepgram_primary" ||
    value === "manual"
  ) {
    return value;
  }
  return DEFAULT_TRANSCRIPTION_SETTINGS.primaryMode;
}

export function getTranscriptionSettingsFromEnv(): TranscriptionSettings {
  const envFallback = process.env.TRANSCRIPTION_AUTO_FALLBACK === "true";
  return {
    ...DEFAULT_TRANSCRIPTION_SETTINGS,
    autoFallbackEnabled: envFallback,
    defaultDeepgramModel:
      process.env.DEEPGRAM_MODEL?.trim() || DEFAULT_TRANSCRIPTION_SETTINGS.defaultDeepgramModel,
  };
}

export async function getTranscriptionSettings(): Promise<TranscriptionSettings> {
  const fallback = getTranscriptionSettingsFromEnv();
  const supabase = createServiceClient();
  if (!supabase) {
    return fallback;
  }

  const { data, error } = await supabase
    .from("platform_transcription_settings")
    .select(
      "primary_mode, auto_fallback_enabled, max_retry_attempts, default_deepinfra_model, default_deepgram_model, deepgram_diarize_default",
    )
    .eq("id", SETTINGS_ROW_ID)
    .maybeSingle();

  if (error || !data) {
    return fallback;
  }

  return {
    primaryMode: parsePrimaryMode(data.primary_mode),
    autoFallbackEnabled: Boolean(data.auto_fallback_enabled),
    maxRetryAttempts: Math.min(3, Math.max(0, Number(data.max_retry_attempts ?? 1))),
    defaultDeepinfraModel:
      data.default_deepinfra_model?.trim() || fallback.defaultDeepinfraModel,
    defaultDeepgramModel:
      data.default_deepgram_model?.trim() || fallback.defaultDeepgramModel,
    deepgramDiarizeDefault: Boolean(data.deepgram_diarize_default),
  };
}

export { SETTINGS_ROW_ID };
