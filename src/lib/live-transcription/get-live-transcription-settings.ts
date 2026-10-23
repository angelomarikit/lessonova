import { isAnthropicConfigured } from "@/lib/anthropic/config";
import { getDeepgramModel, isDeepgramConfigured } from "@/lib/deepgram/config";
import { createServiceClient } from "@/lib/supabase/service";

/** @deprecated Use {@link isLiveTranscriptionAutoEnabled} */
export function isDevLiveTranscriptionAutoEnabled(): boolean {
  return process.env.NODE_ENV === "development" && isLiveTranscriptionAutoEnabled();
}

/**
 * When Deepgram is configured, live STT is on unless explicitly disabled.
 * Works in development and on Vercel (platform DB row may still be false while testing).
 */
export function isLiveTranscriptionAutoEnabled(): boolean {
  if (process.env.LIVE_TRANSCRIPTION_ENABLED === "false") {
    return false;
  }
  return isDeepgramConfigured();
}

/** Student speech uses shared tab audio — on by default (server opt-out only). */
export function resolveClassroomLiveTranscriptionEnabled(): boolean {
  return process.env.LIVE_TRANSCRIPTION_CLASSROOM !== "false";
}

export function resolveLiveTranscriptionEnabled(settings: LiveTranscriptionSettings): boolean {
  if (process.env.LIVE_TRANSCRIPTION_ENABLED === "false") {
    return false;
  }
  if (process.env.LIVE_TRANSCRIPTION_ENABLED === "true") {
    return true;
  }
  if (settings.liveTranscriptionEnabled) {
    return true;
  }
  return isLiveTranscriptionAutoEnabled();
}

/** Dev testing: show grammar fixes in the live chat without an admin toggle. */
export function resolveLiveCorrectionsEnabled(settings: LiveTranscriptionSettings): boolean {
  if (process.env.LIVE_CORRECTIONS_ENABLED === "false") {
    return false;
  }
  if (settings.liveCorrectionsEnabled || process.env.LIVE_CORRECTIONS_ENABLED === "true") {
    return true;
  }
  return process.env.NODE_ENV === "development" && isAnthropicConfigured();
}

export type LiveTranscriptionSettings = {
  liveTranscriptionEnabled: boolean;
  streamingProvider: string;
  streamingModel: string;
  liveCorrectionsEnabled: boolean;
  maxLiveCorrectionRequestsPerLesson: number;
  liveCorrectionIntervalSeconds: number;
  postLessonRetranscriptionEnabled: boolean;
};

export const LIVE_SETTINGS_ROW_ID = "00000000-0000-0000-0000-000000000003";

export function getLiveTranscriptionSettingsFromEnv(): LiveTranscriptionSettings {
  const envExplicitOn = process.env.LIVE_TRANSCRIPTION_ENABLED === "true";
  const envExplicitOff = process.env.LIVE_TRANSCRIPTION_ENABLED === "false";
  return {
    liveTranscriptionEnabled:
      envExplicitOn || (!envExplicitOff && isLiveTranscriptionAutoEnabled()),
    streamingProvider: "deepgram",
    streamingModel: process.env.DEEPGRAM_STREAMING_MODEL?.trim() || getDeepgramModel(),
    liveCorrectionsEnabled: resolveLiveCorrectionsEnabled({
      liveTranscriptionEnabled: false,
      streamingProvider: "deepgram",
      streamingModel: "",
      liveCorrectionsEnabled: process.env.LIVE_CORRECTIONS_ENABLED === "true",
      maxLiveCorrectionRequestsPerLesson: 40,
      liveCorrectionIntervalSeconds: 6,
      postLessonRetranscriptionEnabled: true,
    }),
    maxLiveCorrectionRequestsPerLesson: Number(
      process.env.LIVE_CORRECTION_MAX_REQUESTS ?? "40",
    ),
    liveCorrectionIntervalSeconds: Number(
      process.env.LIVE_CORRECTION_INTERVAL_SECONDS ?? "6",
    ),
    postLessonRetranscriptionEnabled: process.env.POST_LESSON_RETRANSCRIBE !== "false",
  };
}

export async function getLiveTranscriptionSettings(): Promise<LiveTranscriptionSettings> {
  const fallback = getLiveTranscriptionSettingsFromEnv();
  const supabase = createServiceClient();
  if (!supabase) {
    return fallback;
  }

  const { data, error } = await supabase
    .from("platform_live_transcription_settings")
    .select(
      "live_transcription_enabled, streaming_provider, streaming_model, live_corrections_enabled, max_live_correction_requests_per_lesson, live_correction_interval_seconds, post_lesson_retranscription_enabled",
    )
    .eq("id", LIVE_SETTINGS_ROW_ID)
    .maybeSingle();

  if (error || !data) {
    return fallback;
  }

  const merged: LiveTranscriptionSettings = {
    liveTranscriptionEnabled: Boolean(data.live_transcription_enabled),
    streamingProvider: data.streaming_provider ?? "deepgram",
    streamingModel: data.streaming_model?.trim() || fallback.streamingModel,
    liveCorrectionsEnabled: Boolean(data.live_corrections_enabled),
    maxLiveCorrectionRequestsPerLesson: Number(
      data.max_live_correction_requests_per_lesson ?? fallback.maxLiveCorrectionRequestsPerLesson,
    ),
    liveCorrectionIntervalSeconds: Number(
      data.live_correction_interval_seconds ?? fallback.liveCorrectionIntervalSeconds,
    ),
    postLessonRetranscriptionEnabled: Boolean(data.post_lesson_retranscription_enabled),
  };

  return {
    ...merged,
    liveTranscriptionEnabled: resolveLiveTranscriptionEnabled(merged),
    liveCorrectionsEnabled: resolveLiveCorrectionsEnabled(merged),
    maxLiveCorrectionRequestsPerLesson: Math.max(
      merged.maxLiveCorrectionRequestsPerLesson,
      process.env.NODE_ENV === "development" ? 40 : 0,
    ),
    liveCorrectionIntervalSeconds: Math.min(merged.liveCorrectionIntervalSeconds, 6),
  };
}
