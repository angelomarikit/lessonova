"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { DeepgramBrowserLiveSession } from "@/lib/live-transcription/deepgram-browser-live";
import { startPcmStreamFromMediaStream } from "@/lib/live-transcription/pcm-from-media-stream";
import type { MediaStreamAudioTap } from "@/lib/recording/shared-media-stream-audio-tap";
import {
  resolveLiveTranscriptionGrant,
  type LiveGrantPrefetch,
} from "@/lib/live-transcription/prefetch-live-grant";
import type {
  LiveChatMessage,
  LiveGrammarSuggestion,
  LiveSpeakerRole,
} from "@/lib/live-transcription/types";

function speakerLabelFor(role: LiveSpeakerRole, source: "teacher_microphone" | "classroom_tab") {
  if (role === "teacher") {
    return "Teacher";
  }
  if (source === "classroom_tab") {
    return "Student";
  }
  return "Student/other";
}

/** Newest finalized lines kept on screen (~20 back-and-forth turns). Older lines drop after this. */
const LIVE_CHAT_KEEP_FINALS = 40;

function trimLiveChat(list: LiveChatMessage[]): LiveChatMessage[] {
  const listening = list.filter((item) => !item.isFinal);
  const finals = list.filter((item) => item.isFinal);
  const kept =
    finals.length > LIVE_CHAT_KEEP_FINALS
      ? finals.slice(finals.length - LIVE_CHAT_KEEP_FINALS)
      : finals;
  return [...kept, ...listening].sort((a, b) => {
    if (a.isFinal !== b.isFinal) {
      return a.isFinal ? -1 : 1;
    }
    return a.receivedAtMs - b.receivedAtMs;
  });
}

/**
 * Final lines are append-only. Only the in-progress "listening" line for each
 * source is replaced — so earlier turns stay in the chat.
 */
function applyLiveChatMessage(list: LiveChatMessage[], incoming: LiveChatMessage): LiveChatMessage[] {
  const text = incoming.text.trim();
  if (!text) {
    return list;
  }

  if (!incoming.isFinal) {
    const index = list.findIndex((item) => item.segmentKey === incoming.segmentKey);
    if (index === -1) {
      return trimLiveChat([...list, incoming]);
    }
    const next = [...list];
    const prior = next[index]!;
    next[index] = {
      ...incoming,
      receivedAtMs: prior.receivedAtMs,
      text,
    };
    return trimLiveChat(next);
  }

  const listeningKey = `${incoming.source}:listening`;
  let next = list.filter((item) => item.segmentKey !== listeningKey);
  const normalized = text.toLowerCase();
  const duplicate = next.some(
    (item) => item.isFinal && item.source === incoming.source && item.text.trim().toLowerCase() === normalized,
  );
  if (!duplicate) {
    next = [...next, { ...incoming, text }];
  }
  return trimLiveChat(next);
}

function hasLiveAudioTrack(stream: MediaStream | null) {
  return Boolean(
    stream?.getAudioTracks().some((track) => track.readyState !== "ended"),
  );
}

export function useLiveTranscriptionSession(options: {
  lessonId: string | null;
  /** Stable key from audio track ids — avoids reconnecting when MediaStream identity churns. */
  audioStreamKey: string;
  micStream: MediaStream | null;
  classroomStream: MediaStream | null;
  /** Shared mic tap — one AudioContext for meter + live PCM (avoids duplicate mic processing). */
  micAudioTap: MediaStreamAudioTap | null;
  /** Grant request started while the user picks a tab — saves ~200–500ms at connect. */
  grantPrefetch: LiveGrantPrefetch | null;
  active: boolean;
  liveCorrectionsEnabled: boolean;
  correctionIntervalSeconds: number;
}) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<LiveGrammarSuggestion[]>([]);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveConnecting, setLiveConnecting] = useState(false);
  const [correctionsPaused, setCorrectionsPaused] = useState(false);
  const [correctionHint, setCorrectionHint] = useState<string | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const sessionsRef = useRef<DeepgramBrowserLiveSession[]>([]);
  const pcmHandlesRef = useRef<{ stop: () => void }[]>([]);
  const correctionTimerRef = useRef<number | null>(null);
  const pendingStudentUtterancesRef = useRef<{ key: string; text: string }[]>([]);
  const lastCorrectionAtRef = useRef(0);
  const connectGenerationRef = useRef(0);
  const lastConnectedLessonIdRef = useRef<string | null>(null);
  const flushCorrectionsRef = useRef<( () => Promise<void>) | null>(null);

  const teardownMedia = useCallback(() => {
    for (const session of sessionsRef.current) {
      session.close();
    }
    sessionsRef.current = [];
    for (const handle of pcmHandlesRef.current) {
      handle.stop();
    }
    pcmHandlesRef.current = [];
    if (correctionTimerRef.current) {
      window.clearInterval(correctionTimerRef.current);
      correctionTimerRef.current = null;
    }
    setLiveConnected(false);
    setLiveConnecting(false);
  }, []);

  const flushCorrections = useCallback(async () => {
    const opts = optionsRef.current;
    if (!opts.lessonId || correctionsPaused || !opts.liveCorrectionsEnabled) {
      return;
    }
    const batch = pendingStudentUtterancesRef.current.splice(0, 8);
    if (batch.length === 0) {
      return;
    }
    const now = Date.now();
    if (now - lastCorrectionAtRef.current < opts.correctionIntervalSeconds * 1000) {
      pendingStudentUtterancesRef.current.unshift(...batch);
      return;
    }
    lastCorrectionAtRef.current = now;

    const combinedText = batch
      .map((item) => item.text.trim())
      .filter(Boolean)
      .join(" ");
    const anchorKey = batch[batch.length - 1]?.key;
    if (!anchorKey || combinedText.length < 4) {
      return;
    }

    setCorrectionHint("Checking the student's last line…");
    const response = await fetch(`/api/lessons/${opts.lessonId}/live-grammar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        utterances: [{ key: anchorKey, text: combinedText }],
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      corrections?: {
        segmentKey: string;
        originalText: string;
        suggestedText: string;
        explanation: string;
      }[];
    };
    if (!response.ok || !payload.corrections) {
      setCorrectionHint(payload.error ?? "Live correction did not return.");
      return;
    }
    if (payload.corrections.length === 0) {
      setCorrectionHint(null);
      return;
    }
    setCorrectionHint(null);
    setSuggestions((prev) => [
      ...prev,
      ...payload.corrections!.map((item) => ({
        id: `${item.segmentKey}-${item.suggestedText}`,
        segmentKey: item.segmentKey,
        originalText: item.originalText,
        suggestedText: item.suggestedText,
        explanation: item.explanation,
        dismissed: false,
      })),
    ]);
  }, [correctionsPaused]);

  flushCorrectionsRef.current = flushCorrections;

  useEffect(() => {
    if (correctionsPaused || !optionsRef.current.liveCorrectionsEnabled) {
      return;
    }
    void flushCorrectionsRef.current?.();
  }, [correctionsPaused]);

  useEffect(() => {
    const opts = optionsRef.current;
    if (!opts.active || !opts.lessonId) {
      teardownMedia();
      return;
    }

    const mic = hasLiveAudioTrack(opts.micStream) ? opts.micStream : null;
    const classroomCandidate = hasLiveAudioTrack(opts.classroomStream)
      ? opts.classroomStream
      : null;
    if (!mic && !classroomCandidate) {
      setLiveError("No audio streams available for live transcription.");
      setLiveConnecting(false);
      return;
    }

    const generation = ++connectGenerationRef.current;
    let cancelled = false;

    setLiveError(null);
    setLiveConnecting(true);
    if (lastConnectedLessonIdRef.current !== opts.lessonId) {
      setMessages([]);
      setSuggestions([]);
      lastConnectedLessonIdRef.current = opts.lessonId;
    }

    void (async () => {
      const [{ DeepgramBrowserLiveSession }, grantResult] = await Promise.all([
        import("@/lib/live-transcription/deepgram-browser-live"),
        resolveLiveTranscriptionGrant(optionsRef.current.grantPrefetch),
      ]);
      const grantPayload = grantResult.payload;

      if (cancelled || generation !== connectGenerationRef.current) {
        return;
      }

      if (!grantResult.ok || !grantPayload.accessToken) {
        setLiveError(grantPayload.error ?? "Live transcription is unavailable.");
        setLiveConnecting(false);
        return;
      }

      const model = grantPayload.model ?? "nova-3";
      const authProtocol = grantPayload.authProtocol;
      const classroomLiveEnabled = grantPayload.classroomLiveEnabled !== false;
      const latest = optionsRef.current;
      const micNow = hasLiveAudioTrack(latest.micStream) ? latest.micStream : null;
      const classroomNow =
        classroomLiveEnabled && hasLiveAudioTrack(latest.classroomStream)
          ? latest.classroomStream
          : null;

      if (!classroomLiveEnabled && hasLiveAudioTrack(latest.classroomStream)) {
        setCorrectionHint(
          "Student live transcript is off on the server (LIVE_TRANSCRIPTION_CLASSROOM=false). Tab audio is still recorded.",
        );
      }

      const markLive = () => {
        setLiveConnecting(false);
        setLiveConnected(true);
        setLiveError(null);
      };

      const micTap = optionsRef.current.micAudioTap;

      const attach = async (
        stream: MediaStream,
        source: "teacher_microphone" | "classroom_tab",
        role: LiveSpeakerRole,
        attachOptions: { required: boolean },
      ) => {
        let session: import("@/lib/live-transcription/deepgram-browser-live").DeepgramBrowserLiveSession | null =
          null;
        let pcmStarted = false;
        let pcmStop: (() => void) | null = null;
        let pcmConsumer: ((buffer: ArrayBuffer) => void) | null = null;
        let sampleRate = 48000;

        const useSharedMicTap = source === "teacher_microphone" && micTap;
        if (useSharedMicTap) {
          sampleRate = micTap.sampleRate;
        } else {
          const pcm = startPcmStreamFromMediaStream(stream, (buffer) => {
            if (pcmStarted) {
              session?.sendAudio(buffer);
            }
          });
          sampleRate = pcm.sampleRate;
          pcmStop = () => pcm.stop();
        }

        try {
          session = await DeepgramBrowserLiveSession.open({
            accessToken: grantPayload.accessToken!,
            authProtocol,
            relayWebSocketUrl: grantPayload.relayWebSocketUrl,
            model,
            source,
            speakerRole: role,
            sampleRate,
            onOpen: () => {
              pcmStarted = true;
              if (useSharedMicTap && micTap) {
                pcmConsumer = (buffer) => {
                  session?.sendAudio(buffer);
                };
                micTap.addPcmConsumer(pcmConsumer);
              }
              if (attachOptions.required) {
                markLive();
              }
            },
            onError: (message) => {
              if (!attachOptions.required) {
                setCorrectionHint(
                  "Student live transcript could not connect (classroom tab). Mic and recording still work — check network or try again after redeploy.",
                );
                return;
              }
              setLiveConnecting(false);
              setLiveConnected(false);
              setLiveError(message);
              if (pcmConsumer && micTap) {
                micTap.removePcmConsumer(pcmConsumer);
              }
              pcmStop?.();
            },
            onEvent: (event) => {
              if (generation !== connectGenerationRef.current) {
                return;
              }
              markLive();
              const chatMessage: LiveChatMessage = {
                segmentKey: event.segmentKey,
                source: event.source,
                speakerRole: event.speakerRole,
                speakerLabel: speakerLabelFor(event.speakerRole, event.source),
                text: event.text,
                isFinal: event.isFinal,
                receivedAtMs: Date.now(),
                startedAtMs: event.startedAtMs,
                endedAtMs: event.endedAtMs,
              };
              setMessages((prev) => applyLiveChatMessage(prev, chatMessage));

              if (event.speakerRole === "student" && event.isFinal && event.text.trim()) {
                const pending = pendingStudentUtterancesRef.current;
                const existing = pending.findIndex((item) => item.key === event.segmentKey);
                const nextItem = { key: event.segmentKey, text: event.text.trim() };
                if (existing >= 0) {
                  pending[existing] = nextItem;
                } else {
                  pending.push(nextItem);
                }
                if (event.speechFinal) {
                  void flushCorrectionsRef.current?.();
                }
              }
            },
          });
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : "Could not open live transcription connection.";
          if (!attachOptions.required) {
            setCorrectionHint(
              "Student live transcript could not connect (classroom tab). Mic and recording still work.",
            );
            pcmStop?.();
            return;
          }
          setLiveConnecting(false);
          setLiveConnected(false);
          setLiveError(message);
          pcmStop?.();
          return;
        }

        if (cancelled || generation !== connectGenerationRef.current) {
          session.close();
          if (pcmConsumer && micTap) {
            micTap.removePcmConsumer(pcmConsumer);
          }
          pcmStop?.();
          return;
        }

        sessionsRef.current.push(session);
        if (pcmStop) {
          pcmHandlesRef.current.push({ stop: pcmStop });
        }
        if (pcmConsumer && micTap) {
          pcmHandlesRef.current.push({
            stop: () => micTap.removePcmConsumer(pcmConsumer!),
          });
        }
      };

      if (cancelled || generation !== connectGenerationRef.current) {
        return;
      }

      const attaches: Promise<void>[] = [];
      if (micNow) {
        attaches.push(attach(micNow, "teacher_microphone", "teacher", { required: true }));
      }
      if (classroomNow) {
        attaches.push(
          attach(classroomNow, "classroom_tab", "student", { required: !micNow }),
        );
      }
      await Promise.all(attaches);

      if (correctionTimerRef.current) {
        window.clearInterval(correctionTimerRef.current);
      }
      correctionTimerRef.current = window.setInterval(() => {
        void flushCorrectionsRef.current?.();
      }, opts.correctionIntervalSeconds * 1000);
    })();

    return () => {
      cancelled = true;
      teardownMedia();
    };
  }, [options.active, options.lessonId, options.audioStreamKey, options.correctionIntervalSeconds, teardownMedia]);

  const persistFinalUtterances = useCallback(async () => {
    const lessonId = optionsRef.current.lessonId;
    if (!lessonId) {
      return;
    }
    const finals = messages.filter((m) => m.isFinal && m.text.trim());
    if (finals.length === 0) {
      return;
    }
    await fetch(`/api/lessons/${lessonId}/live-transcript`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        utterances: finals.map((m) => ({
          segmentKey: m.segmentKey,
          source: m.source,
          speakerRole: m.speakerRole,
          isFinal: true,
          startedAtMs: m.startedAtMs,
          endedAtMs: m.endedAtMs,
          rawText: m.text,
        })),
      }),
    });
  }, [messages]);

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, dismissed: true } : item)),
    );
  }, []);

  return {
    messages,
    suggestions,
    liveError,
    liveConnected,
    liveConnecting,
    correctionsPaused,
    correctionHint,
    setCorrectionsPaused,
    persistFinalUtterances,
    dismissSuggestion,
  };
}
