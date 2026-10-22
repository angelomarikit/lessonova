export type LiveTranscriptionGrantPayload = {
  accessToken?: string;
  model?: string;
  authProtocol?: "bearer" | "token";
  relayWebSocketUrl?: string;
  error?: string;
};

export type LiveGrantPrefetch = {
  startedAtMs: number;
  promise: Promise<{ ok: boolean; payload: LiveTranscriptionGrantPayload }>;
};

export function startLiveTranscriptionGrantPrefetch(): LiveGrantPrefetch {
  const startedAtMs = Date.now();
  const promise = fetch("/api/live-transcription/grant", { method: "POST" }).then(
    async (response) => ({
      ok: response.ok,
      payload: (await response.json()) as LiveTranscriptionGrantPayload,
    }),
  );
  return { startedAtMs, promise };
}

export async function resolveLiveTranscriptionGrant(
  prefetch: LiveGrantPrefetch | null,
): Promise<{ ok: boolean; payload: LiveTranscriptionGrantPayload }> {
  const maxAgeMs = 55_000;
  if (prefetch && Date.now() - prefetch.startedAtMs < maxAgeMs) {
    return prefetch.promise;
  }
  const response = await fetch("/api/live-transcription/grant", { method: "POST" });
  return {
    ok: response.ok,
    payload: (await response.json()) as LiveTranscriptionGrantPayload,
  };
}
