export type CaptureSource = "teacher_microphone" | "classroom_tab";

export interface ClassroomTabCapture {
  displayStream: MediaStream;
  classroomAudioStream: MediaStream | null;
  hasClassroomAudioTrack: boolean;
}

export interface DualRecordingResult {
  teacherBlob: Blob;
  classroomBlob: Blob | null;
  durationMs: number;
}

function pickMimeType(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export async function requestTeacherMicrophone(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
}

export async function requestClassroomTabCapture(): Promise<ClassroomTabCapture> {
  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true,
  });

  const classroomAudioTracks = displayStream.getAudioTracks();
  const hasClassroomAudioTrack = classroomAudioTracks.length > 0;
  const classroomAudioStream = hasClassroomAudioTrack
    ? new MediaStream(classroomAudioTracks)
    : null;

  return { displayStream, classroomAudioStream, hasClassroomAudioTrack };
}

export class DualAudioRecorder {
  private micStream: MediaStream | null = null;
  private classroomStream: MediaStream | null = null;
  private displayStream: MediaStream | null = null;
  private micRecorder: MediaRecorder | null = null;
  private classroomRecorder: MediaRecorder | null = null;
  private micChunks: Blob[] = [];
  private classroomChunks: Blob[] = [];
  private activeSegmentStartedAt = 0;
  private accumulatedActiveMs = 0;
  private isPaused = false;

  attachStreams(micStream: MediaStream, classroomAudioStream: MediaStream | null, displayStream: MediaStream) {
    this.release();
    this.micStream = micStream;
    this.classroomStream = classroomAudioStream;
    this.displayStream = displayStream;
  }

  start() {
    if (!this.micStream) {
      throw new Error("Microphone stream is not attached.");
    }

    const mimeType = pickMimeType();
    this.micChunks = [];
    this.classroomChunks = [];

    this.micRecorder = new MediaRecorder(this.micStream, mimeType ? { mimeType } : undefined);
    this.micRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.micChunks.push(event.data);
      }
    };
    this.micRecorder.start(1000);

    if (this.classroomStream && this.classroomStream.getAudioTracks().length > 0) {
      this.classroomRecorder = new MediaRecorder(
        this.classroomStream,
        mimeType ? { mimeType } : undefined,
      );
      this.classroomRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.classroomChunks.push(event.data);
        }
      };
      this.classroomRecorder.start(1000);
    }

    this.accumulatedActiveMs = 0;
    this.isPaused = false;
    this.activeSegmentStartedAt = Date.now();
  }

  pause() {
    if (!this.isPaused) {
      this.accumulatedActiveMs += Math.max(0, Date.now() - this.activeSegmentStartedAt);
      this.isPaused = true;
    }
    this.micRecorder?.pause();
    this.classroomRecorder?.pause();
  }

  resume() {
    if (this.isPaused) {
      this.activeSegmentStartedAt = Date.now();
      this.isPaused = false;
    }
    this.micRecorder?.resume();
    this.classroomRecorder?.resume();
  }

  getActiveDurationMs(): number {
    if (this.activeSegmentStartedAt === 0) {
      return 0;
    }
    const tail = this.isPaused ? 0 : Math.max(0, Date.now() - this.activeSegmentStartedAt);
    return this.accumulatedActiveMs + tail;
  }

  async stop(): Promise<DualRecordingResult> {
    const durationMs = this.getActiveDurationMs();

    const teacherBlob = await this.stopRecorder(this.micRecorder, this.micChunks);
    const classroomBlob = this.classroomRecorder
      ? await this.stopRecorder(this.classroomRecorder, this.classroomChunks)
      : null;

    this.micRecorder = null;
    this.classroomRecorder = null;

    return { teacherBlob, classroomBlob, durationMs };
  }

  release() {
    for (const stream of [this.micStream, this.classroomStream, this.displayStream]) {
      stream?.getTracks().forEach((track) => track.stop());
    }
    this.micStream = null;
    this.classroomStream = null;
    this.displayStream = null;
    this.micRecorder = null;
    this.classroomRecorder = null;
    this.micChunks = [];
    this.classroomChunks = [];
  }

  private stopRecorder(recorder: MediaRecorder | null, chunks: Blob[]): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!recorder) {
        resolve(new Blob([], { type: "audio/webm" }));
        return;
      }

      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
      };
      recorder.onerror = () => reject(new Error("Recording failed while finalizing audio."));
      recorder.stop();
    });
  }
}
