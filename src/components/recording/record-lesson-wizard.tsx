"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Mic, Monitor, Pause, Play, Square, X } from "lucide-react";

import { AudioLevelBar } from "@/components/recording/audio-level-bar";
import { StudentQuickAddForm } from "@/components/students/student-quick-add-form";
import { Button } from "@/components/ui/button";
import { createAudioLevelMonitor } from "@/lib/recording/audio-level-monitor";
import { detectBrowserCapabilities } from "@/lib/recording/browser-capabilities";
import { RECORDING_CONSENT_TEXT, RECORDING_CONSENT_VERSION } from "@/lib/recording/consent";
import {
  DualAudioRecorder,
  requestClassroomTabCapture,
  requestTeacherMicrophone,
} from "@/lib/recording/dual-audio-recorder";
import { PLATFORM_GUIDANCE } from "@/lib/recording/platform-guidance";
import {
  TEACHING_PLATFORMS,
  formatTestStatus,
  getPlatformById,
  type TeachingPlatformId,
} from "@/lib/recording/platforms";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type StudentOption = { id: string; display_name: string };

const STEPS = [
  "Select student",
  "Select platform",
  "Consent",
  "Microphone",
  "Classroom tab audio",
  "Audio verification",
  "Record lesson",
  "Processing",
] as const;

export function RecordLessonWizard() {
  const searchParams = useSearchParams();
  const preselectedStudentId = searchParams.get("student") ?? "";
  const [step, setStep] = useState(0);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentId, setStudentId] = useState("");
  const [platformId, setPlatformId] = useState<TeachingPlatformId>("google_meet");
  const [consentChecked, setConsentChecked] = useState(false);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [micGranted, setMicGranted] = useState(false);
  const [tabGranted, setTabGranted] = useState(false);
  const [hasTabAudioTrack, setHasTabAudioTrack] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [tabLevel, setTabLevel] = useState(0);

  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);

  const micStreamRef = useRef<MediaStream | null>(null);
  const tabAudioStreamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef(new DualAudioRecorder());
  const timerRef = useRef<number | null>(null);
  const stopMicMonitorRef = useRef<(() => void) | null>(null);
  const stopTabMonitorRef = useRef<(() => void) | null>(null);

  const browser = useMemo(() => detectBrowserCapabilities(), []);
  const platform = getPlatformById(platformId);
  const guidance = PLATFORM_GUIDANCE[platformId];
  const selectedStudent = students.find((student) => student.id === studentId);

  useEffect(() => {
    void loadStudents();
    return () => {
      cleanupStreams();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!recording || paused) {
      return;
    }
    timerRef.current = window.setInterval(() => setElapsedMs((value) => value + 1000), 1000);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [recording, paused]);

  async function loadStudents() {
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return;
      }
      const { data } = await supabase
        .from("students")
        .select("id, display_name")
        .eq("teacher_id", user.id)
        .eq("is_active", true)
        .order("display_name");
      const rows = data ?? [];
      setStudents(rows);
      if (preselectedStudentId && rows.some((row) => row.id === preselectedStudentId)) {
        setStudentId(preselectedStudentId);
      }
    } catch {
      setError("Could not load students. Apply the Phase 2 Supabase migration if needed.");
    }
  }

  function cleanupStreams() {
    stopMicMonitorRef.current?.();
    stopTabMonitorRef.current?.();
    stopMicMonitorRef.current = null;
    stopTabMonitorRef.current = null;
    recorderRef.current.release();
    micStreamRef.current = null;
    tabAudioStreamRef.current = null;
    displayStreamRef.current = null;
  }

  async function logTelemetry(eventType: string, metadata: Record<string, unknown> = {}) {
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return;
      }
      await supabase.from("recording_telemetry_events").insert({
        teacher_id: user.id,
        lesson_id: lessonId,
        teaching_platform: platformId,
        event_type: eventType,
        browser_name: browser.label,
        metadata,
      });
    } catch {
      // Telemetry must not block recording flow.
    }
  }

  async function ensureLessonSession() {
    if (lessonId) {
      return lessonId;
    }
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !studentId) {
      throw new Error("Missing teacher or student.");
    }

    const { data: consent, error: consentError } = await supabase
      .from("consent_records")
      .insert({
        teacher_id: user.id,
        student_id: studentId,
        consent_text_version: RECORDING_CONSENT_VERSION,
        metadata: { platform: platformId },
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
        student_id: studentId,
        teaching_platform: platformId,
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

  async function requestMic() {
    setError(null);
    try {
      await ensureLessonSession();
      const stream = await requestTeacherMicrophone();
      micStreamRef.current = stream;
      setMicGranted(true);
      stopMicMonitorRef.current?.();
      stopMicMonitorRef.current = createAudioLevelMonitor(stream, setMicLevel);
      await logTelemetry("microphone_granted");
      setStep(4);
    } catch (cause) {
      setMicGranted(false);
      await logTelemetry("microphone_denied", {
        message: cause instanceof Error ? cause.message : "unknown",
      });
      setError("Microphone access was denied or unavailable.");
    }
  }

  async function requestTabAudio() {
    setError(null);
    try {
      const capture = await requestClassroomTabCapture();
      displayStreamRef.current = capture.displayStream;
      tabAudioStreamRef.current = capture.classroomAudioStream;
      setTabGranted(true);
      setHasTabAudioTrack(capture.hasClassroomAudioTrack);

      if (capture.displayStream.getVideoTracks()[0]) {
        capture.displayStream.getVideoTracks()[0]!.onended = () => {
          setTabGranted(false);
          setHasTabAudioTrack(false);
          setInfo("Classroom tab sharing ended.");
        };
      }

      stopTabMonitorRef.current?.();
      if (capture.classroomAudioStream) {
        stopTabMonitorRef.current = createAudioLevelMonitor(capture.classroomAudioStream, setTabLevel);
      } else {
        setTabLevel(0);
      }

      await logTelemetry("display_media_result", {
        hasAudioTrack: capture.hasClassroomAudioTrack,
      });

      if (!capture.hasClassroomAudioTrack) {
        setInfo(
          "No classroom audio track was detected. You can continue with teacher microphone only or choose another tab/browser.",
        );
      }

      setStep(5);
    } catch (cause) {
      setTabGranted(false);
      setHasTabAudioTrack(false);
      await logTelemetry("display_media_denied", {
        message: cause instanceof Error ? cause.message : "unknown",
      });
      setError("Classroom tab sharing was cancelled or blocked.");
    }
  }

  function attachRecorderAndStart() {
    if (!micStreamRef.current || !displayStreamRef.current) {
      setError("Audio streams are not ready.");
      return;
    }

    recorderRef.current.attachStreams(
      micStreamRef.current,
      tabAudioStreamRef.current,
      displayStreamRef.current,
    );
    recorderRef.current.start();
    setRecording(true);
    setPaused(false);
    setElapsedMs(0);
    setStep(6);
  }

  async function stopRecording() {
    setRecording(false);
    setPaused(false);
    setStep(7);
    setProcessingMessage("Finalizing and uploading lesson audio...");

    try {
      const result = await recorderRef.current.stop();
      const activeLessonId = lessonId ?? (await ensureLessonSession());
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated.");
      }

      await supabase
        .from("lessons")
        .update({
          status: "uploading",
          recording_duration_seconds: Math.round(result.durationMs / 1000),
          microphone_capture_status: "captured",
          classroom_audio_capture_status: result.classroomBlob ? "captured" : "unavailable",
        })
        .eq("id", activeLessonId);

      const teacherPath = `${user.id}/${activeLessonId}/teacher-microphone.webm`;
      const teacherUpload = await supabase.storage
        .from("lesson-recordings")
        .upload(teacherPath, result.teacherBlob, {
          contentType: result.teacherBlob.type || "audio/webm",
          upsert: true,
        });

      if (teacherUpload.error) {
        throw new Error(teacherUpload.error.message);
      }

      await supabase.from("recording_assets").upsert(
        {
          lesson_id: activeLessonId,
          teacher_id: user.id,
          kind: "teacher_microphone",
          storage_bucket: "lesson-recordings",
          storage_path: teacherPath,
          mime_type: result.teacherBlob.type || "audio/webm",
          byte_size: result.teacherBlob.size,
          duration_ms: result.durationMs,
        },
        { onConflict: "lesson_id,kind" },
      );

      if (result.classroomBlob) {
        const classroomPath = `${user.id}/${activeLessonId}/classroom-tab.webm`;
        const classroomUpload = await supabase.storage
          .from("lesson-recordings")
          .upload(classroomPath, result.classroomBlob, {
            contentType: result.classroomBlob.type || "audio/webm",
            upsert: true,
          });
        if (classroomUpload.error) {
          throw new Error(classroomUpload.error.message);
        }
        await supabase.from("recording_assets").upsert(
          {
            lesson_id: activeLessonId,
            teacher_id: user.id,
            kind: "classroom_tab",
            storage_bucket: "lesson-recordings",
            storage_path: classroomPath,
            mime_type: result.classroomBlob.type || "audio/webm",
            byte_size: result.classroomBlob.size,
            duration_ms: result.durationMs,
          },
          { onConflict: "lesson_id,kind" },
        );
      }

      await supabase
        .from("lessons")
        .update({ status: "draft", error_message: null })
        .eq("id", activeLessonId);

      cleanupStreams();

      setProcessingMessage(
        "Upload complete. Open the lesson and click Transcribe with AI when you are ready to run DeepInfra.",
      );
      await logTelemetry("lesson_upload_completed", {
        hasClassroomAudio: Boolean(result.classroomBlob),
        durationMs: result.durationMs,
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Upload failed.";
      setError(message);
      setProcessingMessage(null);
      await logTelemetry("lesson_upload_failed", { message });
      if (lessonId) {
        const supabase = getSupabaseBrowserClient();
        await supabase
          .from("lessons")
          .update({ status: "failed", error_message: message })
          .eq("id", lessonId);
      }
    }
  }

  function cancelRecordingFlow() {
    cleanupStreams();
    setRecording(false);
    setPaused(false);
    setProcessingMessage(null);
    setError(null);
    setInfo("Recording cancelled.");
    setStep(0);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Record lesson</p>
            <h1 className="mt-2 text-2xl font-bold">Browser classroom capture</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Dual-audio companion for browser-based ESL classrooms. This records your microphone and,
              when your browser allows it, audio from the classroom tab you select.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted px-3 py-2 text-xs">
            <p className="font-semibold text-foreground">{browser.label}</p>
            <p className="text-muted-foreground">{formatTestStatus("not_yet_tested")} platform matrix</p>
          </div>
        </div>

        {browser.warnings.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Compatibility notice
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {browser.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <ol className="mb-6 flex flex-wrap gap-2">
          {STEPS.map((label, index) => (
            <li
              key={label}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                index === step
                  ? "bg-primary text-white"
                  : index < step
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {index + 1}. {label}
            </li>
          ))}
        </ol>

        {error ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {info ? <p className="mb-4 rounded-xl bg-primary/5 px-4 py-3 text-sm text-foreground">{info}</p> : null}

        {step === 0 ? (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Student</span>
              <select
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select a student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.display_name}
                  </option>
                ))}
              </select>
            </label>
            <StudentQuickAddForm />
            <Button disabled={!studentId} onClick={() => setStep(1)}>
              Continue
            </Button>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Platform selection guides your workflow and lesson metadata. It does not guarantee capture
              support.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {TEACHING_PLATFORMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPlatformId(item.id)}
                  className={cn(
                    "cursor-pointer rounded-2xl border px-4 py-3 text-left transition-colors",
                    platformId === item.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30",
                  )}
                >
                  <p className="font-semibold">{item.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatTestStatus(item.testStatus)}
                  </p>
                </button>
              ))}
            </div>
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="font-semibold">{guidance.title}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                {guidance.steps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
              {guidance.notes?.map((note) => (
                <p key={note} className="mt-2 text-xs text-muted-foreground">
                  {note}
                </p>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button onClick={() => setStep(2)}>Continue</Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <p className="rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-relaxed">
              {RECORDING_CONSENT_TEXT}
            </p>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(event) => setConsentChecked(event.target.checked)}
                className="mt-1"
              />
              <span>I confirm recording consent for this lesson.</span>
            </label>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                disabled={!consentChecked}
                onClick={async () => {
                  try {
                    await ensureLessonSession();
                    setStep(3);
                  } catch (cause) {
                    setError(cause instanceof Error ? cause.message : "Could not create lesson.");
                  }
                }}
              >
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Allow Lessonova to access your microphone for teacher audio.
            </p>
            <Button onClick={() => void requestMic()}>
              <Mic className="h-4 w-4" />
              Allow microphone
            </Button>
            {micGranted ? (
              <p className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Microphone access granted
              </p>
            ) : null}
            <Button variant="secondary" onClick={() => setStep(2)}>
              Back
            </Button>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share the active classroom tab and enable audio when your browser prompts you.
            </p>
            <Button onClick={() => void requestTabAudio()}>
              <Monitor className="h-4 w-4" />
              Share classroom tab
            </Button>
            {tabGranted ? (
              <p className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Tab sharing active {hasTabAudioTrack ? "with audio track" : "without audio track"}
              </p>
            ) : null}
            <Button variant="secondary" onClick={() => setStep(3)}>
              Back
            </Button>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Confirm both sources before recording. This check listens locally and does not upload
              lesson audio.
            </p>
            <AudioLevelBar label="Teacher microphone" level={micLevel} active={micGranted} tone="primary" />
            <AudioLevelBar
              label="Classroom tab audio"
              level={tabLevel}
              active={hasTabAudioTrack}
              tone="lime"
            />
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => setStep(4)}>
                Back
              </Button>
              <Button onClick={attachRecorderAndStart} disabled={!micGranted}>
                Start recording
              </Button>
            </div>
          </div>
        ) : null}

        {step === 6 ? (
          <div className="space-y-4">
            <div className="grid gap-4 rounded-2xl border border-border bg-muted/30 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Student</p>
                <p className="font-semibold">{selectedStudent?.display_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Platform</p>
                <p className="font-semibold">{platform.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Timer</p>
                <p className="font-semibold">{formatElapsed(elapsedMs)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Sources</p>
                <p className="text-sm">
                  Mic {micGranted ? "on" : "off"} · Tab audio {hasTabAudioTrack ? "on" : "off"}
                </p>
              </div>
            </div>

            <AudioLevelBar label="Teacher waveform" level={micLevel} active={recording} />
            <AudioLevelBar
              label="Classroom waveform"
              level={tabLevel}
              active={recording && hasTabAudioTrack}
              tone="lime"
            />

            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  if (paused) {
                    recorderRef.current.resume();
                    setPaused(false);
                  } else {
                    recorderRef.current.pause();
                    setPaused(true);
                  }
                }}
              >
                {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {paused ? "Resume" : "Pause"}
              </Button>
              <Button onClick={() => void stopRecording()}>
                <Square className="h-4 w-4" />
                Stop & upload
              </Button>
              <Button variant="secondary" onClick={cancelRecordingFlow}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {step === 7 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {processingMessage ?? "Processing lesson..."}
            </p>
            {lessonId ? (
              <div className="flex flex-wrap gap-4">
                <Link
                  href={`/dashboard/lessons/${lessonId}`}
                  className="cursor-pointer text-sm font-semibold text-primary hover:underline"
                >
                  Open lesson & transcribe
                </Link>
                <Link href="/dashboard/lessons" className="cursor-pointer text-sm font-semibold text-primary hover:underline">
                  View lesson history
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function formatElapsed(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
