import {
  DEEPINFRA_WHISPER_ENDPOINT,
  DEEPINFRA_WHISPER_MODEL,
  getDeepInfraApiKey,
} from "@/lib/deepinfra/config";

export type WhisperSegment = {
  id?: number;
  start: number;
  end: number;
  text: string;
};

export type WhisperTranscriptionResult = {
  model: string;
  text: string;
  segments: WhisperSegment[];
  language: string | null;
  inputLengthMs: number | null;
  duration: number | null;
  inferenceRuntimeMs: number | null;
  estimatedCostUsd: number | null;
  requestId: string | null;
};

export class DeepInfraTranscriptionError extends Error {
  code: string;
  status: number;
  retryable: boolean;

  constructor(message: string, options: { code: string; status: number; retryable?: boolean }) {
    super(message);
    this.name = "DeepInfraTranscriptionError";
    this.code = options.code;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
  }
}

function safeErrorMessage(body: unknown, status: number): DeepInfraTranscriptionError {
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const detail =
    (typeof record.detail === "string" && record.detail) ||
    (typeof record.error === "string" && record.error) ||
    (typeof record.message === "string" && record.message) ||
    `DeepInfra request failed with status ${status}.`;

  const normalized = detail.toLowerCase();
  const billingBlocked =
    status === 402 ||
    normalized.includes("credit") ||
    normalized.includes("billing") ||
    normalized.includes("payment") ||
    normalized.includes("quota");

  const rateLimited = status === 429 || normalized.includes("rate limit");

  const message = billingBlocked
    ? status === 402
      ? "DeepInfra returned 402 Payment Required. Add credits or a payment method at deepinfra.com (Billing), then retry transcription. Your lesson audio is already saved."
      : detail
    : detail;

  return new DeepInfraTranscriptionError(message, {
    code: billingBlocked ? "billing_or_credits" : rateLimited ? "rate_limited" : "provider_error",
    status,
    retryable: rateLimited,
  });
}

export async function transcribeAudioBuffer(
  audio: Buffer,
  filename: string,
  mimeType: string,
): Promise<WhisperTranscriptionResult> {
  const apiKey = getDeepInfraApiKey();
  if (!apiKey) {
    throw new DeepInfraTranscriptionError("DeepInfra is not configured on the server.", {
      code: "missing_api_key",
      status: 500,
    });
  }

  const form = new FormData();
  const blob = new Blob([new Uint8Array(audio)], { type: mimeType || "audio/webm" });
  form.append("audio", blob, filename);

  const response = await fetch(DEEPINFRA_WHISPER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok || !payload) {
    throw safeErrorMessage(payload, response.status);
  }

  const segmentsRaw = Array.isArray(payload.segments) ? payload.segments : [];
  const segments: WhisperSegment[] = [];
  for (const segment of segmentsRaw) {
    if (typeof segment !== "object" || segment === null) {
      continue;
    }
    const value = segment as Record<string, unknown>;
    const text = typeof value.text === "string" ? value.text.trim() : "";
    if (!text) {
      continue;
    }
    segments.push({
      id: typeof value.id === "number" ? value.id : undefined,
      start: typeof value.start === "number" ? value.start : 0,
      end: typeof value.end === "number" ? value.end : 0,
      text,
    });
  }

  const text =
    (typeof payload.text === "string" && payload.text.trim()) ||
    segments.map((segment) => segment.text).join(" ").trim();

  const inferenceStatus =
    typeof payload.inference_status === "object" && payload.inference_status !== null
      ? (payload.inference_status as Record<string, unknown>)
      : null;

  return {
    model: DEEPINFRA_WHISPER_MODEL,
    text,
    segments,
    language: typeof payload.language === "string" ? payload.language : null,
    inputLengthMs: typeof payload.input_length_ms === "number" ? payload.input_length_ms : null,
    duration: typeof payload.duration === "number" ? payload.duration : null,
    inferenceRuntimeMs:
      typeof inferenceStatus?.runtime_ms === "number" ? inferenceStatus.runtime_ms : null,
    estimatedCostUsd: typeof inferenceStatus?.cost === "number" ? inferenceStatus.cost : null,
    requestId: typeof payload.request_id === "string" ? payload.request_id : null,
  };
}
