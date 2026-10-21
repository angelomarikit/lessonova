import { DeepInfraTranscriptionError } from "@/lib/deepinfra/transcribe-audio";

export type TranscriptionFailureCode =
  | "missing_api_key"
  | "billing_or_credits"
  | "auth_forbidden"
  | "rate_limited"
  | "provider_error"
  | "empty_transcript"
  | "transcription_failed";

export class TranscriptionError extends Error {
  code: TranscriptionFailureCode;
  status: number;
  retryable: boolean;
  provider: "deepinfra" | "deepgram";

  constructor(
    message: string,
    options: {
      code: TranscriptionFailureCode;
      status: number;
      retryable?: boolean;
      provider: "deepinfra" | "deepgram";
    },
  ) {
    super(message);
    this.name = "TranscriptionError";
    this.code = options.code;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
    this.provider = options.provider;
  }
}

export function isEligibleForAutomaticFallback(error: TranscriptionError): boolean {
  if (error.code === "billing_or_credits" || error.code === "missing_api_key") {
    return false;
  }
  if (error.code === "auth_forbidden") {
    return false;
  }
  if (error.code === "empty_transcript") {
    return false;
  }
  return error.retryable;
}

export function fromDeepInfraError(error: DeepInfraTranscriptionError): TranscriptionError {
  return new TranscriptionError(error.message, {
    code: error.code as TranscriptionFailureCode,
    status: error.status,
    retryable: error.retryable,
    provider: "deepinfra",
  });
}

export function fromDeepgramError(error: unknown): TranscriptionError {
  const record =
    typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};
  const status =
    typeof record.statusCode === "number"
      ? record.statusCode
      : typeof record.status === "number"
        ? record.status
        : 502;
  const message =
    (typeof record.message === "string" && record.message) || "Deepgram transcription failed.";

  const normalized = message.toLowerCase();
  const billing =
    status === 402 ||
    normalized.includes("insufficient") ||
    normalized.includes("balance") ||
    normalized.includes("billing") ||
    normalized.includes("payment");
  const auth = status === 401 || status === 403;
  const rateLimited = status === 429;

  let code: TranscriptionFailureCode = "provider_error";
  if (billing) {
    code = "billing_or_credits";
  } else if (auth) {
    code = "auth_forbidden";
  } else if (rateLimited) {
    code = "rate_limited";
  }

  return new TranscriptionError(
    billing
      ? "Deepgram billing or credits blocked this request. Add credits at console.deepgram.com, then retry manually."
      : message,
    {
      code,
      status,
      retryable: rateLimited || status >= 500,
      provider: "deepgram",
    },
  );
}
