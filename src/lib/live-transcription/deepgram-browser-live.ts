import type { LiveCaptureSource, LiveSpeakerRole } from "@/lib/live-transcription/types";

export type LiveTranscriptEvent = {
  segmentKey: string;
  source: LiveCaptureSource;
  speakerRole: LiveSpeakerRole;
  text: string;
  isFinal: boolean;
  speechFinal: boolean;
  startedAtMs: number;
  endedAtMs?: number;
};

type DeepgramLiveMessage = {
  type?: string;
  duration?: number;
  start?: number;
  is_final?: boolean;
  speech_final?: boolean;
  description?: string;
  message?: string;
  channel?: {
    alternatives?: {
      transcript?: string;
      words?: { word?: string; start?: number; end?: number }[];
    }[];
  };
};

function liveAuthProtocol(explicit?: "bearer" | "token"): "bearer" | "token" {
  if (explicit === "token" || explicit === "bearer") {
    return explicit;
  }
  const fromEnv = process.env.NEXT_PUBLIC_DEEPGRAM_LIVE_AUTH_PROTOCOL?.trim().toLowerCase();
  if (fromEnv === "token" || fromEnv === "bearer") {
    return fromEnv;
  }
  return "bearer";
}

export class DeepgramBrowserLiveSession {
  private socket: WebSocket | null = null;
  private closed = false;
  private source: LiveCaptureSource;
  private speakerRole: LiveSpeakerRole;
  private finalCount = 0;
  private onEvent: (event: LiveTranscriptEvent) => void;
  private onError: (message: string) => void;
  private keepAliveTimer: number | null = null;
  private reportedError = false;

  private constructor(options: {
    source: LiveCaptureSource;
    speakerRole: LiveSpeakerRole;
    onEvent: (event: LiveTranscriptEvent) => void;
    onError: (message: string) => void;
  }) {
    this.source = options.source;
    this.speakerRole = options.speakerRole;
    this.onEvent = options.onEvent;
    this.onError = options.onError;
  }

  /**
   * Browser-native WebSocket (2-arg constructor only). The Deepgram SDK passes a
   * third `options.headers` argument that Chrome rejects, so we connect directly.
   */
  static open(options: {
    accessToken: string;
    authProtocol?: "bearer" | "token";
    /** Dev relay (ws://127.0.0.1:3001/listen) — no JWT subprotocol in the browser. */
    relayWebSocketUrl?: string;
    model: string;
    source: LiveCaptureSource;
    speakerRole: LiveSpeakerRole;
    sampleRate: number;
    onOpen?: () => void;
    onEvent: (event: LiveTranscriptEvent) => void;
    onError: (message: string) => void;
  }): Promise<DeepgramBrowserLiveSession> {
    const session = new DeepgramBrowserLiveSession(options);
    const authProtocol = liveAuthProtocol(options.authProtocol);

    const params = new URLSearchParams({
      model: options.model,
      language: "en",
      encoding: "linear16",
      sample_rate: String(Math.round(options.sampleRate)),
      channels: "1",
      interim_results: "true",
      punctuate: "true",
      endpointing: "200",
      utterance_end_ms: "1000",
    });

    const query = params.toString();
    const useRelay = Boolean(options.relayWebSocketUrl?.trim());
    const url = useRelay
      ? `${options.relayWebSocketUrl!.replace(/\?$/, "")}?${query}`
      : `wss://api.deepgram.com/v1/listen?${query}`;

    return new Promise((resolve, reject) => {
      let settled = false;

      try {
        session.socket = useRelay
          ? new WebSocket(url)
          : new WebSocket(url, [authProtocol, options.accessToken]);
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Could not create live transcription socket.";
        reject(new Error(message));
        return;
      }

      session.socket.binaryType = "arraybuffer";

      session.socket.onopen = () => {
        session.keepAliveTimer = window.setInterval(() => {
          if (session.socket?.readyState === WebSocket.OPEN) {
            session.socket.send(JSON.stringify({ type: "KeepAlive" }));
          }
        }, 8000);
        options.onOpen?.();
        if (!settled) {
          settled = true;
          resolve(session);
        }
      };

      session.socket.onmessage = (message) => {
        try {
          const payload = JSON.parse(String(message.data)) as DeepgramLiveMessage;
          session.handleMessage(payload);
        } catch {
          session.reportError("Could not parse live transcription message.");
        }
      };

      session.socket.onerror = () => {
        if (!settled) {
          settled = true;
          reject(
            new Error(
              useRelay
                ? "Live transcription relay failed. Stop the dev server and run npm run dev (starts the Deepgram relay on port 3001)."
                : "Live transcription WebSocket connection failed.",
            ),
          );
          return;
        }
        session.reportError("Live transcription connection error.");
      };

      session.socket.onclose = (event) => {
        if (!settled) {
          settled = true;
          const reason = event.reason?.trim();
          reject(
            new Error(
              reason
                ? `Live transcription disconnected (${event.code}): ${reason}`
                : `Live transcription disconnected (code ${event.code}).`,
            ),
          );
          return;
        }
        session.handleClose(event);
      };
    });
  }

  private handleMessage(payload: DeepgramLiveMessage) {
    if (payload.type === "Error") {
      this.reportError(
        payload.message?.trim() ||
          payload.description?.trim() ||
          "Live transcription error from Deepgram.",
      );
      return;
    }
    if (payload.type !== "Results") {
      return;
    }
    const alternative = payload.channel?.alternatives?.[0];
    const words = alternative?.words ?? [];
    const fromWords = words
      .map((word) => word.word ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const fromTranscript = (alternative?.transcript ?? "").replace(/\s+/g, " ").trim();
    const transcript = fromWords.length > fromTranscript.length ? fromWords : fromTranscript;
    if (!transcript.trim()) {
      return;
    }
    const speechFinal = Boolean(payload.speech_final);
    const isFinal = Boolean(payload.is_final || payload.speech_final);
    const startSec = payload.start ?? 0;
    const durationSec = payload.duration ?? 0;
    const segmentKey = isFinal
      ? `${this.source}:final:${this.finalCount++}`
      : `${this.source}:listening`;
    this.onEvent({
      segmentKey,
      source: this.source,
      speakerRole: this.speakerRole,
      text: transcript,
      isFinal,
      speechFinal,
      startedAtMs: Math.round(startSec * 1000),
      endedAtMs: Math.round((startSec + durationSec) * 1000),
    });
  }

  private handleClose(event: CloseEvent) {
    if (this.keepAliveTimer) {
      window.clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    if (!this.closed && !this.reportedError) {
      const reason = event.reason?.trim();
      this.reportError(
        reason
          ? `Live transcription disconnected (${event.code}): ${reason}`
          : `Live transcription disconnected (code ${event.code}). Check Deepgram key, model, and billing.`,
      );
    }
  }

  private reportError(message: string) {
    if (this.reportedError) {
      return;
    }
    this.reportedError = true;
    this.onError(message);
  }

  sendAudio(pcm: ArrayBuffer) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(pcm);
    }
  }

  close() {
    this.closed = true;
    if (this.keepAliveTimer) {
      window.clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    if (this.socket?.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({ type: "CloseStream" }));
      } catch {
        // Already closing.
      }
    }
    try {
      this.socket?.close();
    } catch {
      // Already closed.
    }
    this.socket = null;
  }
}
