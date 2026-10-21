import { type DualAudioRecorder } from "@/lib/recording/dual-audio-recorder";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export async function finalizeLessonRecording({
  lessonId,
  recorder,
  recordedDurationMs,
}: {
  lessonId: string;
  recorder: DualAudioRecorder;
  /** UI timer (excludes paused time); used when it differs slightly from recorder clock. */
  recordedDurationMs?: number;
}) {
  const result = await recorder.stop();
  const durationMs =
    recordedDurationMs != null && recordedDurationMs > 0
      ? recordedDurationMs
      : result.durationMs;
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
      recording_duration_seconds: Math.round(durationMs / 1000),
      microphone_capture_status: "captured",
      classroom_audio_capture_status: result.classroomBlob ? "captured" : "unavailable",
    })
    .eq("id", lessonId);

  const teacherPath = `${user.id}/${lessonId}/teacher-microphone.webm`;
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
      lesson_id: lessonId,
      teacher_id: user.id,
      kind: "teacher_microphone",
      storage_bucket: "lesson-recordings",
      storage_path: teacherPath,
      mime_type: result.teacherBlob.type || "audio/webm",
      byte_size: result.teacherBlob.size,
      duration_ms: durationMs,
    },
    { onConflict: "lesson_id,kind" },
  );

  if (result.classroomBlob) {
    const classroomPath = `${user.id}/${lessonId}/classroom-tab.webm`;
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
        lesson_id: lessonId,
        teacher_id: user.id,
        kind: "classroom_tab",
        storage_bucket: "lesson-recordings",
        storage_path: classroomPath,
        mime_type: result.classroomBlob.type || "audio/webm",
        byte_size: result.classroomBlob.size,
        duration_ms: durationMs,
      },
      { onConflict: "lesson_id,kind" },
    );
  }

  await supabase.from("lessons").update({ status: "draft", error_message: null }).eq("id", lessonId);

  return {
    durationMs,
    hasClassroomAudio: Boolean(result.classroomBlob),
  };
}
