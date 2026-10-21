import { isDeepInfraConfigured } from "@/lib/deepinfra/config";
import { isDeepgramConfigured } from "@/lib/deepgram/config";
import { transcribeWithDeepgram } from "@/lib/transcription/providers/deepgram-provider";
import { transcribeWithDeepInfra } from "@/lib/transcription/providers/deepinfra-provider";
import type {
  RecordingAssetKind,
  TranscriptionProviderId,
  TranscriptionResult,
  TranscriptionSettings,
} from "@/lib/transcription/types";

export type TranscriptionRequestMode = "auto" | TranscriptionProviderId;

export function isProviderConfigured(provider: TranscriptionProviderId): boolean {
  return provider === "deepinfra" ? isDeepInfraConfigured() : isDeepgramConfigured();
}

export function resolveProviderChain(options: {
  settings: TranscriptionSettings;
  requestedProvider?: TranscriptionRequestMode;
  allowFallback: boolean;
}): TranscriptionProviderId[] {
  const fallbackProvider = (primary: TranscriptionProviderId): TranscriptionProviderId =>
    primary === "deepinfra" ? "deepgram" : "deepinfra";

  if (options.requestedProvider === "deepinfra" || options.requestedProvider === "deepgram") {
    return [options.requestedProvider];
  }

  let primary: TranscriptionProviderId;
  if (options.settings.primaryMode === "deepgram_primary") {
    primary = "deepgram";
  } else if (options.settings.primaryMode === "manual") {
    return [];
  } else {
    primary = "deepinfra";
  }

  const chain: TranscriptionProviderId[] = [primary];
  if (
    options.allowFallback &&
    options.settings.autoFallbackEnabled &&
    options.settings.maxRetryAttempts > 0
  ) {
    chain.push(fallbackProvider(primary));
  }
  return chain;
}

export async function runProviderTranscription(options: {
  provider: TranscriptionProviderId;
  audio: Buffer;
  filename: string;
  mimeType: string;
  source: RecordingAssetKind;
  settings: TranscriptionSettings;
}): Promise<TranscriptionResult> {
  if (options.provider === "deepinfra") {
    return transcribeWithDeepInfra({
      audio: options.audio,
      filename: options.filename,
      mimeType: options.mimeType,
      model: options.settings.defaultDeepinfraModel,
    });
  }

  return transcribeWithDeepgram({
    audio: options.audio,
    filename: options.filename,
    mimeType: options.mimeType,
    model: options.settings.defaultDeepgramModel,
    source: options.source,
    enableDiarize: options.settings.deepgramDiarizeDefault,
  });
}
