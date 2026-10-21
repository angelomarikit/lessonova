"use client";

import { ChevronUp, Mic, Minimize2, Pause, Play, Square, Volume2 } from "lucide-react";

import { LiveTranscriptChat } from "@/components/recording/live-transcript-chat";
import { Button } from "@/components/ui/button";
import type { LiveChatMessage, LiveGrammarSuggestion } from "@/lib/live-transcription/types";

function formatElapsed(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

type AudioStatus = "connected" | "muted" | "no_audio" | "missing_permission" | "disconnected";

function statusLabel(status: AudioStatus) {
  switch (status) {
    case "connected":
      return "Connected";
    case "muted":
      return "Muted";
    case "no_audio":
      return "No audio detected";
    case "missing_permission":
      return "Permission missing";
    default:
      return "Disconnected";
  }
}

export function RecordLessonFloatingPanel({
  studentName,
  platformLabel,
  elapsedMs,
  minimized,
  paused,
  micLevel,
  tabLevel,
  micStatus,
  tabStatus,
  messages,
  suggestions,
  liveError,
  liveConnecting,
  correctionsPaused,
  correctionHint,
  onToggleMinimize,
  onTogglePause,
  onStopAndSave,
  onToggleCorrections,
  onDismissSuggestion,
}: {
  studentName: string;
  platformLabel: string;
  elapsedMs: number;
  minimized: boolean;
  expanded: boolean;
  paused: boolean;
  micLevel: number;
  tabLevel: number;
  micStatus: AudioStatus;
  tabStatus: AudioStatus;
  messages: LiveChatMessage[];
  suggestions: LiveGrammarSuggestion[];
  liveError: string | null;
  liveConnecting: boolean;
  correctionsPaused: boolean;
  correctionHint: string | null;
  onToggleMinimize: () => void;
  onToggleExpand: () => void;
  onTogglePause: () => void;
  onStopAndSave: () => void;
  onToggleCorrections: () => void;
  onDismissSuggestion: (id: string) => void;
}) {
  if (minimized) {
    return (
      <div className="fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-white px-5 py-2.5 shadow-lg">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
        <span className="text-sm font-semibold">Recording {studentName}</span>
        <span className="font-mono text-sm tabular-nums">{formatElapsed(elapsedMs)}</span>
        <button
          type="button"
          className="rounded-full p-1 hover:bg-muted"
          onClick={onToggleMinimize}
          aria-label="Restore recording panel"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-[#171C19]/25" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recording-panel-title"
        className="relative flex max-h-[min(900px,92vh)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-2xl"
      >
        <header className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p
                id="recording-panel-title"
                className="flex items-center gap-2 font-display text-lg font-bold sm:text-xl"
              >
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                Recording lesson
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Student: <span className="font-medium text-foreground">{studentName}</span> ·{" "}
                {platformLabel}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-muted px-3 py-1.5 font-mono text-lg font-semibold tabular-nums">
                {formatElapsed(elapsedMs)}
              </span>
              <button
                type="button"
                className="rounded-xl border border-border p-2 hover:bg-muted"
                onClick={onToggleMinimize}
                aria-label="Minimize"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Mic className="h-4 w-4 text-primary" />
                Teacher microphone
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{statusLabel(micStatus)}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full bg-primary transition-all duration-100"
                  style={{ width: `${Math.round(micLevel * 100)}%` }}
                />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Volume2 className="h-4 w-4 text-primary" />
                Student / classroom audio
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{statusLabel(tabStatus)}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full bg-primary transition-all duration-100"
                  style={{ width: `${Math.round(tabLevel * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col px-5 py-4 sm:px-6">
          <LiveTranscriptChat
            variant="large"
            messages={messages}
            suggestions={suggestions}
            onDismissSuggestion={onDismissSuggestion}
            liveUnavailableMessage={liveError}
            liveConnecting={liveConnecting && !liveError}
          />
        </div>

        <footer className="shrink-0 space-y-3 border-t border-border bg-muted/20 px-5 py-4 sm:px-6">
          <p className="text-center text-xs text-muted-foreground sm:text-left">
            Keep this tab open until your lesson is saved.
          </p>
          <label className="flex items-center justify-center gap-2 text-sm text-muted-foreground sm:justify-start">
            <input type="checkbox" checked={!correctionsPaused} onChange={onToggleCorrections} />
            Live AI corrections in the chat
          </label>
          {correctionHint ? (
            <p className="text-center text-xs text-muted-foreground sm:text-left">{correctionHint}</p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" size="lg" className="sm:w-auto" onClick={onTogglePause}>
              {paused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button
              type="button"
              size="lg"
              className="flex-1 bg-rose-100 text-base font-semibold text-rose-900 hover:bg-rose-200"
              onClick={onStopAndSave}
            >
              <Square className="mr-2 h-4 w-4 fill-current" />
              Stop &amp; save lesson
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
