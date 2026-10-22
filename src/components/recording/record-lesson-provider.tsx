"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { RecordLessonFloatingPanel } from "@/components/recording/record-lesson-floating-panel";
import { RecordLessonModal } from "@/components/recording/record-lesson-modal";
import { createAudioLevelMonitor } from "@/lib/recording/audio-level-monitor";
import { detectBrowserCapabilities } from "@/lib/recording/browser-capabilities";
import { RECORDING_CONSENT_VERSION } from "@/lib/recording/consent";
import {
  DualAudioRecorder,
  requestClassroomTabCapture,
  requestTeacherMicrophone,
  stopDisplayVideoTracks,
} from "@/lib/recording/dual-audio-recorder";
import {
  liveCorrectionIntervalSeconds,
  liveCorrectionsEnabledDuringRecording,
} from "@/lib/recording/recording-performance";
import { finalizeLessonRecording } from "@/lib/recording/finalize-lesson-recording";
import { useLiveTranscriptionSession } from "@/lib/live-transcription/use-live-transcription-session";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export type RecordLessonPhase =
  | "closed"
  | "pick-student"
  | "requesting-media"
  | "recording"
  | "uploading"
  | "transcribing"
  | "filed"
  | "error";

type StudentOption = { id: string; display_name: string };

type RecordLessonContextValue = {
  openRecord: (preselectedStudentId?: string | null) => void;
  closeRecord: () => void;
  phase: RecordLessonPhase;
};

const RecordLessonContext = createContext<RecordLessonContextValue | null>(null);

export function useRecordLesson() {
  const ctx = useContext(RecordLessonContext);
  if (!ctx) {
    throw new Error("useRecordLesson must be used within RecordLessonProvider");
  }
  return ctx;
}

export function RecordLessonProvider({
  children,
  trialCreditsLabel,
}: {
  children: ReactNode;
  trialCreditsLabel: string;
}) {
  const router = useRouter();
  const browser = useMemo(() => detectBrowserCapabilities(), []);

  const [phase, setPhase] = useState<RecordLessonPhase>("closed");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [trialLesson, setTrialLesson] = useState(false);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcribeSkippedReason, setTranscribeSkippedReason] = useState<string | null>(null);
  const [panelMinimized, setPanelMinimized] = useState(false);
  const [paused, setPaused] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [tabLevel, setTabLevel] = useState(0);

  const micStreamRef = useRef<MediaStream | null>(null);
  const tabAudioStreamRef = useRef<MediaStream | null>(null);
  const [liveCaptureStreams, setLiveCaptureStreams] = useState<{
    mic: MediaStream | null;
    tab: MediaStream | null;
  }>({ mic: null, tab: null });
  const liveAudioStreamKey = useMemo(() => {
    const micId =
      liveCaptureStreams.mic
        ?.getAudioTracks()
        .find((track) => track.readyState === "live")
        ?.id ?? "none";
    const tabId =
      liveCaptureStreams.tab
        ?.getAudioTracks()
        .find((track) => track.readyState === "live")
        ?.id ?? "none";
    return `${micId}|${tabId}`;
  }, [liveCaptureStreams.mic, liveCaptureStreams.tab]);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef(new DualAudioRecorder());
  const timerRef = useRef<number | null>(null);
  const levelStopRef = useRef<(() => void)[]>([]);
  const panelMinimizedRef = useRef(panelMinimized);
  panelMinimizedRef.current = panelMinimized;

  const live = useLiveTranscriptionSession({
    lessonId,
    audioStreamKey: liveAudioStreamKey,
    micStream: liveCaptureStreams.mic,
    classroomStream: liveCaptureStreams.tab,
    active: phase === "recording" && !paused,
    liveCorrectionsEnabled: liveCorrectionsEnabledDuringRecording(),
    correctionIntervalSeconds: liveCorrectionIntervalSeconds(),
  });

  const resetCapture = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    for (const stop of levelStopRef.current) {
      stop();
    }
    levelStopRef.current = [];
    recorderRef.current.release();
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    tabAudioStreamRef.current?.getTracks().forEach((track) => track.stop());
    displayStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    tabAudioStreamRef.current = null;
    displayStreamRef.current = null;
    setLiveCaptureStreams({ mic: null, tab: null });
    setMicLevel(0);
    setTabLevel(0);
    setPaused(false);
    setPanelMinimized(false);
  }, []);

  const closeRecord = useCallback(() => {
    resetCapture();
    setPhase("closed");
    setStudentQuery("");
    setSelectedStudent(null);
    setTrialLesson(false);
    setLessonId(null);
    setElapsedMs(0);
    setErrorMessage(null);
    setTranscribeSkippedReason(null);
  }, [resetCapture]);

  const loadStudents = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }
    const { data } = await supabase
      .from("students")
      .select("id, display_name")
      .eq("teacher_id", user.id)
      .eq("is_active", true)
      .order("display_name");
    return data ?? [];
  }, []);

  const openRecord = useCallback(
    async (preselectedStudentId?: string | null) => {
      setErrorMessage(null);
      setTranscribeSkippedReason(null);
      setStudentQuery("");
      setTrialLesson(false);
      setElapsedMs(0);
      setLessonId(null);
      resetCapture();

      const rows = await loadStudents();
      setStudents(rows);
      setPhase("pick-student");

      if (preselectedStudentId) {
        const match = rows.find((row) => row.id === preselectedStudentId);
        if (match) {
          setSelectedStudent(match);
        }
      } else {
        setSelectedStudent(null);
      }
    },
    [loadStudents, resetCapture],
  );

  async function ensureLessonSession(student: StudentOption, isTrial: boolean) {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Not authenticated.");
    }

    const { data: consent, error: consentError } = await supabase
      .from("consent_records")
      .insert({
        teacher_id: user.id,
        student_id: student.id,
        consent_text_version: RECORDING_CONSENT_VERSION,
        metadata: { platform: "google_meet", is_trial_lesson: isTrial },
      })
      .select("id")
      .single();

    if (consentError) {
      throw new Error(consentError.message);
    }

    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .insert({
        teacher_id: user.id,
        student_id: student.id,
        teaching_platform: "google_meet",
        status: "draft",
        browser_name: browser.label,
        browser_capability: browser,
        consent_record_id: consent.id,
      })
      .select("id")
      .single();

    if (lessonError) {
      throw new Error(lessonError.message);
    }

    setLessonId(lesson.id);
    return lesson.id;
  }

  const beginCaptureForStudent = useCallback(
    async (student: StudentOption) => {
      setSelectedStudent(student);
      setPhase("requesting-media");
      setErrorMessage(null);

      try {
        await ensureLessonSession(student, trialLesson);

        const micStream = await requestTeacherMicrophone();
        micStreamRef.current = micStream;

        const capture = await requestClassroomTabCapture();
        displayStreamRef.current = capture.displayStream;
        tabAudioStreamRef.current = capture.classroomAudioStream;
        setLiveCaptureStreams({
          mic: micStream,
          tab: capture.classroomAudioStream,
        });

        const onShareEnded = () => {
          setErrorMessage("Classroom tab sharing ended. Stop and save the lesson when ready.");
        };
        for (const track of capture.displayStream.getAudioTracks()) {
          track.onended = onShareEnded;
        }
        stopDisplayVideoTracks(capture.displayStream);

        levelStopRef.current.push(
          createAudioLevelMonitor(micStream, (level) => {
            if (!panelMinimizedRef.current) {
              setMicLevel(level);
            }
          }),
        );
        if (capture.classroomAudioStream) {
          levelStopRef.current.push(
            createAudioLevelMonitor(capture.classroomAudioStream, (level) => {
              if (!panelMinimizedRef.current) {
                setTabLevel(level);
              }
            }),
          );
        }

        recorderRef.current.attachStreams(
          micStream,
          capture.classroomAudioStream,
          capture.displayStream,
        );
        recorderRef.current.start();
        setElapsedMs(0);
        setPhase("recording");
      } catch (cause) {
        resetCapture();
        setPhase("pick-student");
        setErrorMessage(
          cause instanceof Error
            ? cause.message
            : "Could not start recording. Allow microphone and share your classroom tab with audio.",
        );
      }
    },
    [browser, resetCapture, trialLesson],
  );

  useEffect(() => {
    if (phase !== "recording" || paused) {
      return;
    }
    timerRef.current = window.setInterval(() => setElapsedMs((value) => value + 1000), 1000);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [paused, phase]);

  useEffect(() => {
    const blockExit =
      phase === "recording" || phase === "uploading" || phase === "transcribing";
    if (!blockExit) {
      return;
    }
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [phase]);

  const togglePause = useCallback(() => {
    if (phase !== "recording") {
      return;
    }
    if (paused) {
      recorderRef.current.resume();
      setPaused(false);
    } else {
      recorderRef.current.pause();
      setPaused(true);
    }
  }, [paused, phase]);

  const stopAndFileLesson = useCallback(async () => {
    if (!lessonId) {
      setErrorMessage("Lesson session missing.");
      setPhase("error");
      return;
    }

    setPhase("uploading");
    try {
      await live.persistFinalUtterances();
      const recordedDurationMs =
        recorderRef.current.getActiveDurationMs() || elapsedMs;
      await finalizeLessonRecording({
        lessonId,
        recorder: recorderRef.current,
        recordedDurationMs,
      });
      resetCapture();
      setPhase("transcribing");

      const response = await fetch(`/api/lessons/${lessonId}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowFallback: true }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        analysis?: { ok?: boolean; message?: string; code?: string };
      };

      if (!response.ok) {
        setTranscribeSkippedReason(
          payload.message || payload.error || "Batch transcription skipped; using live transcript if available.",
        );
      } else {
        setTranscribeSkippedReason(null);
      }

      const analysisFromTranscribe =
        response.ok &&
        payload.analysis &&
        "ok" in payload.analysis &&
        payload.analysis.ok === true;

      if (!analysisFromTranscribe) {
        const analyzeResponse = await fetch(`/api/lessons/${lessonId}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forceRegenerate: true }),
        });
        const analyzePayload = (await analyzeResponse.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
        };
        if (!analyzeResponse.ok || !analyzePayload.ok) {
          setTranscribeSkippedReason(
            analyzePayload.message ||
              (payload.analysis && "message" in payload.analysis
                ? String(payload.analysis.message)
                : null) ||
              "Audio saved; retry Generate lesson feedback on the review page.",
          );
        } else {
          setTranscribeSkippedReason(null);
        }
      }

      setPhase("closed");
      setLessonId(null);
      setSelectedStudent(null);
      router.push(`/dashboard/lessons/${lessonId}/review`);
      router.refresh();
    } catch (cause) {
      resetCapture();
      setErrorMessage(cause instanceof Error ? cause.message : "Could not save the lesson.");
      setPhase("error");
      if (lessonId) {
        await getSupabaseBrowserClient()
          .from("lessons")
          .update({
            status: "failed",
            error_message: cause instanceof Error ? cause.message : "Upload failed",
          })
          .eq("id", lessonId);
      }
    }
  }, [lessonId, live, resetCapture, router]);

  const micTrack = micStreamRef.current?.getAudioTracks()[0];
  const micStatus =
    !micTrack || micTrack.readyState === "ended"
      ? "disconnected"
      : micTrack.muted
        ? "muted"
        : micLevel < 0.03
          ? "no_audio"
          : "connected";

  const tabTrack = tabAudioStreamRef.current?.getAudioTracks()[0];
  const tabStatus = !tabAudioStreamRef.current
    ? "missing_permission"
    : !tabTrack || tabTrack.readyState === "ended"
      ? "disconnected"
      : tabLevel < 0.03
        ? "no_audio"
        : "connected";

  const value = useMemo(
    () => ({
      openRecord,
      closeRecord,
      phase,
    }),
    [closeRecord, openRecord, phase],
  );

  return (
    <RecordLessonContext.Provider value={value}>
      {children}
      <RecordLessonModal
        open={phase !== "closed" && phase !== "recording"}
        phase={phase}
        students={students}
        studentQuery={studentQuery}
        onStudentQueryChange={setStudentQuery}
        selectedStudent={selectedStudent}
        trialLesson={trialLesson}
        onTrialLessonChange={setTrialLesson}
        trialCreditsLabel={trialCreditsLabel}
        elapsedMs={elapsedMs}
        errorMessage={errorMessage}
        transcribeSkippedReason={transcribeSkippedReason}
        lessonId={lessonId}
        onCancel={closeRecord}
        onSelectStudent={(student) => void beginCaptureForStudent(student)}
        onStopAndFile={() => void stopAndFileLesson()}
        onRecordAnother={() => void openRecord(null)}
        onCloseFiled={closeRecord}
      />
      {phase === "recording" && selectedStudent ? (
        <RecordLessonFloatingPanel
          studentName={selectedStudent.display_name}
          platformLabel="Google Meet"
          elapsedMs={elapsedMs}
          minimized={panelMinimized}
          expanded
          paused={paused}
          micLevel={micLevel}
          tabLevel={tabLevel}
          micStatus={micStatus}
          tabStatus={tabStatus}
          messages={live.messages}
          suggestions={live.suggestions}
          liveError={live.liveError}
          liveConnecting={live.liveConnecting}
          correctionsPaused={live.correctionsPaused}
          correctionHint={live.correctionHint}
          onToggleMinimize={() => setPanelMinimized((value) => !value)}
          onToggleExpand={() => undefined}
          onTogglePause={togglePause}
          onStopAndSave={() => void stopAndFileLesson()}
          onToggleCorrections={() => live.setCorrectionsPaused((value) => !value)}
          onDismissSuggestion={live.dismissSuggestion}
        />
      ) : null}
    </RecordLessonContext.Provider>
  );
}
