export type LiveCaptureSource = "teacher_microphone" | "classroom_tab";

export type LiveSpeakerRole = "teacher" | "student" | "unknown";

export type LiveChatMessage = {
  segmentKey: string;
  source: LiveCaptureSource;
  speakerRole: LiveSpeakerRole;
  speakerLabel: string;
  text: string;
  isFinal: boolean;
  startedAtMs: number;
  endedAtMs?: number;
};

export type LiveGrammarSuggestion = {
  id: string;
  segmentKey: string;
  originalText: string;
  suggestedText: string;
  explanation: string;
  dismissed: boolean;
};
