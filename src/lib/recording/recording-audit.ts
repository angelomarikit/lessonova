/**
 * Recording & transcription audit notes (Lessonova).
 * Used for diagnostics and admin tooling — not a guarantee of accuracy.
 */

export type RecordingAuditFinding = {
  id: string;
  severity: "info" | "warning" | "error";
  area: string;
  summary: string;
  detail: string;
};

export const RECORDING_PIPELINE_AUDIT: RecordingAuditFinding[] = [
  {
    id: "separate-tracks",
    severity: "info",
    area: "Capture",
    summary: "Teacher mic and classroom tab are recorded separately",
    detail:
      "DualAudioRecorder uses two MediaRecorder instances (teacher_microphone + classroom_tab). Sources are not mixed before upload.",
  },
  {
    id: "webm-opus",
    severity: "info",
    area: "Encoding",
    summary: "Post-lesson audio is WebM/Opus via MediaRecorder",
    detail:
      "Browser-dependent mime type (typically audio/webm;codecs=opus). DeepInfra Whisper accepts uploaded WebM; quality depends on browser encoder and bitrate defaults.",
  },
  {
    id: "chunk-interval",
    severity: "info",
    area: "Capture",
    summary: "1 second MediaRecorder timeslice",
    detail:
      "ondataavailable fires every 1000ms. Very short utterances at stop boundary may lose tail frames if stop() is called abruptly.",
  },
  {
    id: "no-sample-rate-control",
    severity: "warning",
    area: "Encoding",
    summary: "No explicit sample-rate or bitrate on MediaRecorder",
    detail:
      "getUserMedia uses echoCancellation/noiseSuppression/autoGainControl but does not pin sample rate. Whisper may resample server-side; WER can vary by device.",
  },
  {
    id: "classroom-audio-optional",
    severity: "warning",
    area: "Capture",
    summary: "Classroom audio depends on tab share + Share tab audio",
    detail:
      "If the teacher shares screen without tab audio, classroomStream is null and student speech may only appear on the mic track (with echo risk).",
  },
  {
    id: "mic-echo-bleed",
    severity: "warning",
    area: "Speaker separation",
    summary: "Teacher microphone may capture speaker playback",
    detail:
      "Without headphones, classroom audio can bleed into the mic track, causing duplicate or mis-attributed lines. Prefer headphones or rely on classroom_tab source.",
  },
  {
    id: "whisper-single-speaker-label",
    severity: "warning",
    area: "Post-lesson STT",
    summary: "Whisper path assigns one speaker label per source track",
    detail:
      "transcribe-lesson.ts labels all segments on teacher_microphone as Teacher. Student speech on the mic track is not split by diarization on DeepInfra today.",
  },
  {
    id: "classroom-student-mapping",
    severity: "info",
    area: "Speaker separation",
    summary: "Classroom track is labeled as classroom/student-inclusive",
    detail:
      "Deepgram diarization (backup/post) can suggest speaker indices but does not map to student name without teacher confirmation.",
  },
  {
    id: "no-live-path-legacy",
    severity: "info",
    area: "Live STT",
    summary: "Legacy flow was post-lesson only",
    detail:
      "Live Deepgram streaming is added alongside existing DeepInfra finalize step; both may incur separate usage.",
  },
];

export function computeWordErrorRate(reference: string, hypothesis: string): {
  wer: number;
  missing: number;
  incorrect: number;
  inserted: number;
  refWords: number;
} {
  const ref = reference
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const hyp = hypothesis
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const n = ref.length;
  const m = hyp.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 0; i <= n; i += 1) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= m; j += 1) {
    dp[0][j] = j;
  }
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      if (ref[i - 1] === hyp[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  let i = n;
  let j = m;
  let incorrect = 0;
  let missing = 0;
  let inserted = 0;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ref[i - 1] === hyp[j - 1]) {
      i -= 1;
      j -= 1;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      incorrect += 1;
      i -= 1;
      j -= 1;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      missing += 1;
      i -= 1;
    } else {
      inserted += 1;
      j -= 1;
    }
  }

  const wer = n === 0 ? (m > 0 ? 1 : 0) : dp[n][m] / n;
  return { wer, missing, incorrect, inserted, refWords: n };
}
