import { DeepgramClient, DeepgramError } from "@deepgram/sdk";

import {
  DEEPGRAM_ESTIMATED_USD_PER_MINUTE,
  getDeepgramApiKey,
  getDeepgramModel,
} from "@/lib/deepgram/config";
import { fromDeepgramError, TranscriptionError } from "@/lib/transcription/errors";
import type { RecordingAssetKind, TranscriptionResult } from "@/lib/transcription/types";

function estimateDeepgramCostUsd(durationSeconds: number | null): number | null {
  if (durationSeconds == null || !Number.isFinite(durationSeconds)) {
    return null;
  }
  const minutes = durationSeconds / 60;
  return Math.round(minutes * DEEPGRAM_ESTIMATED_USD_PER_MINUTE * 1_000_000) / 1_000_000;
}

export async function transcribeWithDeepgram(options: {
  audio: Buffer;
  filename: string;
  mimeType: string;
  model?: string;
  source: RecordingAssetKind;
  enableDiarize: boolean;
}): Promise<TranscriptionResult> {
  const apiKey = getDeepgramApiKey();
  if (!apiKey) {
    throw new TranscriptionError("Deepgram is not configured on the server.", {
      code: "missing_api_key",
      status: 503,
      provider: "deepgram",
    });
  }

  const model = options.model ?? getDeepgramModel();
  const diarizeForSource =
    options.enableDiarize && options.source === "classroom_tab";

  const client = new DeepgramClient({ apiKey });

  try {
    const response = await client.listen.v1.media.transcribeFile(options.audio, {
      model,
      language: "en",
      smart_format: false,
      filler_words: true,
      utterances: true,
      ...(diarizeForSource ? { diarize_model: "latest" as const } : {}),
    });

    if (!("results" in response) || !response.results) {
      throw new TranscriptionError(
        "Deepgram returned an async-only response; Lessonova requires synchronous batch results.",
        {
          code: "provider_error",
          status: 502,
          provider: "deepgram",
        },
      );
    }

    const channel = response.results.channels?.[0];
    const alternative = channel?.alternatives?.[0];
    const utterances = response.results.utterances ?? [];
    const text =
      (alternative?.transcript?.trim() ?? "") ||
      utterances.map((u) => u.transcript?.trim() ?? "").filter(Boolean).join(" ").trim();

    if (!text) {
      throw new TranscriptionError("Deepgram returned an empty transcript.", {
        code: "empty_transcript",
        status: 502,
        provider: "deepgram",
      });
    }

    const segments =
      utterances.length > 0
        ? utterances
            .map((utterance) => {
              const segmentText =
                utterance.words?.map((word) => word.word ?? "").join(" ").trim() ||
                utterance.transcript?.trim() ||
                "";
              if (!segmentText) {
                return null;
              }
              return {
                start: utterance.start ?? 0,
                end: utterance.end ?? utterance.start ?? 0,
                text: segmentText,
                confidence: utterance.confidence ?? null,
                diarizedSpeaker:
                  typeof utterance.speaker === "number" ? utterance.speaker : null,
              };
            })
            .filter((segment): segment is NonNullable<typeof segment> => segment !== null)
        : (alternative?.words ?? [])
            .reduce<
              {
                start: number;
                end: number;
                text: string;
                diarizedSpeaker: number | null;
              }[]
            >((acc, word) => {
              const token = word.word ?? "";
              if (!token) {
                return acc;
              }
              const last = acc[acc.length - 1];
              const speaker =
                typeof word.speaker === "number" ? word.speaker : null;
              if (
                last &&
                last.diarizedSpeaker === speaker &&
                (word.start ?? 0) - last.end < 0.75
              ) {
                last.text = `${last.text} ${token}`.trim();
                last.end = word.end ?? last.end;
                return acc;
              }
              acc.push({
                start: word.start ?? 0,
                end: word.end ?? word.start ?? 0,
                text: token,
                diarizedSpeaker: speaker,
              });
              return acc;
            }, [])
            .map((segment) => ({
              ...segment,
              confidence: null as number | null,
            }));

    const durationSeconds = response.metadata?.duration ?? null;
    const requestId = response.metadata?.request_id ?? null;

    return {
      provider: "deepgram",
      model,
      text,
      segments,
      language: channel?.detected_language ?? "en",
      requestId,
      estimatedCostUsd: estimateDeepgramCostUsd(durationSeconds),
      inferenceRuntimeMs: null,
      metadata: {
        durationSeconds,
        diarizeEnabled: diarizeForSource,
        diarizeInfo: response.metadata?.diarize_info ?? null,
      },
    };
  } catch (error) {
    if (error instanceof TranscriptionError) {
      throw error;
    }
    if (error instanceof DeepgramError) {
      throw fromDeepgramError(error);
    }
    throw fromDeepgramError(error);
  }
}
