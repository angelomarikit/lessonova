"use client";

import { useEffect, useRef, useState } from "react";
import { GraduationCap, Sparkles, UserRound } from "lucide-react";

import type { LiveChatMessage, LiveGrammarSuggestion } from "@/lib/live-transcription/types";
import { cn } from "@/lib/utils";

function formatClock(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function LiveTranscriptChat({
  messages,
  suggestions,
  onDismissSuggestion,
  liveUnavailableMessage,
  liveConnecting = false,
  variant = "default",
}: {
  messages: LiveChatMessage[];
  suggestions: LiveGrammarSuggestion[];
  onDismissSuggestion: (id: string) => void;
  liveUnavailableMessage?: string | null;
  liveConnecting?: boolean;
  variant?: "default" | "large";
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const isLarge = variant === "large";

  useEffect(() => {
    if (!autoScroll || !scrollRef.current) {
      return;
    }
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [autoScroll, messages, suggestions]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <p className={cn("font-semibold", isLarge ? "text-base" : "text-sm")}>Live transcript</p>
        {liveUnavailableMessage ? (
          <span className="text-xs font-medium text-amber-700">Offline</span>
        ) : liveConnecting ? (
          <span className="text-xs font-medium text-muted-foreground">Connecting…</span>
        ) : (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Live
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={() => {
          const node = scrollRef.current;
          if (!node) {
            return;
          }
          const atBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 64;
          setAutoScroll(atBottom);
        }}
        className={cn(
          "flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border bg-muted/15 p-4 sm:p-5",
          isLarge ? "min-h-[min(52vh,480px)]" : "min-h-[220px]",
        )}
      >
        {liveUnavailableMessage ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{liveUnavailableMessage}</p>
        ) : null}

        {messages.length === 0 && !liveUnavailableMessage ? (
          <p className="text-sm text-muted-foreground">
            {liveConnecting
              ? "Connecting to live transcription… (mic only is fine if classroom tab has no audio.)"
              : "Waiting for speech…"}
          </p>
        ) : null}

        {messages.map((message) => {
          const isTeacher = message.speakerRole === "teacher";
          const suggestion = suggestions.find(
            (item) => item.segmentKey === message.segmentKey && !item.dismissed,
          );
          return (
            <div
              key={message.segmentKey}
              className={cn("flex w-full flex-col", isTeacher ? "items-start" : "items-end")}
            >
              <div
                className={cn(
                  "rounded-2xl border px-4 py-3 shadow-sm",
                  isLarge ? "max-w-[92%] sm:max-w-[85%]" : "max-w-[95%]",
                  isTeacher
                    ? "border-border bg-white text-foreground"
                    : "border-primary/25 bg-primary/10 text-foreground",
                  !message.isFinal && "opacity-75",
                )}
              >
                <div
                  className={cn(
                    "mb-2 flex items-center gap-2 font-semibold uppercase tracking-wide text-muted-foreground",
                    isLarge ? "text-xs" : "text-[10px]",
                  )}
                >
                  {isTeacher ? (
                    <GraduationCap className={isLarge ? "h-4 w-4" : "h-3 w-3"} />
                  ) : (
                    <UserRound className={cn(isLarge ? "h-4 w-4" : "h-3 w-3", "text-primary")} />
                  )}
                  {message.speakerLabel} · {formatClock(message.startedAtMs)}
                  {!message.isFinal ? (
                    <span className="normal-case font-normal italic text-muted-foreground/80">
                      (listening…)
                    </span>
                  ) : null}
                </div>
                <p
                  className={cn(
                    "leading-relaxed",
                    isLarge ? "text-base sm:text-lg" : "text-sm",
                    !message.isFinal && "italic",
                  )}
                >
                  {message.text}
                </p>
              </div>
              {suggestion ? (
                <div
                  className={cn(
                    "mt-2 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3",
                    isLarge ? "max-w-[92%] sm:max-w-[85%]" : "max-w-[95%]",
                    isTeacher ? "self-start" : "self-end",
                  )}
                >
                  <p
                    className={cn(
                      "flex items-start gap-2 font-semibold text-primary",
                      isLarge ? "text-sm" : "text-xs",
                    )}
                  >
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Suggested: &quot;{suggestion.suggestedText}&quot;
                    </span>
                  </p>
                  <p className={cn("mt-2 text-muted-foreground", isLarge ? "text-sm" : "text-xs")}>
                    {suggestion.explanation}
                  </p>
                  <button
                    type="button"
                    className="mt-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
                    onClick={() => onDismissSuggestion(suggestion.id)}
                  >
                    Dismiss
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {!autoScroll ? (
        <button
          type="button"
          className="mt-3 self-center text-sm font-semibold text-primary hover:underline"
          onClick={() => {
            setAutoScroll(true);
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }}
        >
          Jump to live
        </button>
      ) : null}
    </div>
  );
}
