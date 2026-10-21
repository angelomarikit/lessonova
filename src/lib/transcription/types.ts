export type TranscriptionProviderId = "deepinfra" | "deepgram";

export type RecordingAssetKind = "teacher_microphone" | "classroom_tab";

export type TranscriptionPrimaryMode =
  | "deepinfra_primary"
  | "deepgram_primary"
  | "manual";

export type TranscriptionSegment = {
  start: number;
  end: number;
  text: string;
  confidence?: number | null;
  /** Deepgram diarization index when present — not lesson role. */
  diarizedSpeaker?: number | null;
};

export type TranscriptionResult = {
  provider: TranscriptionProviderId;
  model: string;
  text: string;
  segments: TranscriptionSegment[];
  language: string | null;
  requestId: string | null;
  estimatedCostUsd: number | null;
  inferenceRuntimeMs: number | null;
  metadata?: Record<string, unknown>;
};

export type TranscriptionSettings = {
  primaryMode: TranscriptionPrimaryMode;
  autoFallbackEnabled: boolean;
  maxRetryAttempts: number;
  defaultDeepinfraModel: string;
  defaultDeepgramModel: string;
  deepgramDiarizeDefault: boolean;
};

export const DEFAULT_TRANSCRIPTION_SETTINGS: TranscriptionSettings = {
  primaryMode: "deepinfra_primary",
  autoFallbackEnabled: false,
  maxRetryAttempts: 1,
  defaultDeepinfraModel: "openai/whisper-large-v3-turbo",
  defaultDeepgramModel: "nova-3",
  deepgramDiarizeDefault: false,
};
