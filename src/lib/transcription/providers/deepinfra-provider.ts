import { DEEPINFRA_WHISPER_MODEL } from "@/lib/deepinfra/config";
import {
  DeepInfraTranscriptionError,
  transcribeAudioBuffer,
} from "@/lib/deepinfra/transcribe-audio";
import { fromDeepInfraError } from "@/lib/transcription/errors";
import type { TranscriptionResult } from "@/lib/transcription/types";

export async function transcribeWithDeepInfra(options: {
  audio: Buffer;
  filename: string;
  mimeType: string;
  model?: string;
}): Promise<TranscriptionResult> {
  try {
    const result = await transcribeAudioBuffer(options.audio, options.filename, options.mimeType);
    if (!result.text.trim()) {
      throw new DeepInfraTranscriptionError("DeepInfra returned an empty transcript.", {
        code: "empty_transcript",
        status: 502,
      });
    }

    return {
      provider: "deepinfra",
      model: options.model ?? DEEPINFRA_WHISPER_MODEL,
      text: result.text,
      segments: result.segments.map((segment) => ({
        start: segment.start,
        end: segment.end,
        text: segment.text,
      })),
      language: result.language,
      requestId: result.requestId,
      estimatedCostUsd: result.estimatedCostUsd,
      inferenceRuntimeMs: result.inferenceRuntimeMs,
    };
  } catch (error) {
    if (error instanceof DeepInfraTranscriptionError) {
      throw fromDeepInfraError(error);
    }
    throw error;
  }
}
