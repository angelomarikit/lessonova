/**
 * Tuning for recording while screen-sharing a video call (Preply, Meet, etc.).
 * Set NEXT_PUBLIC_RECORDING_LOW_CPU=true in .env.local to maximize headroom.
 */
export function isRecordingLowCpuMode(): boolean {
  return process.env.NEXT_PUBLIC_RECORDING_LOW_CPU === "true";
}

export function liveCorrectionsEnabledDuringRecording(): boolean {
  if (isRecordingLowCpuMode()) {
    return false;
  }
  return process.env.NEXT_PUBLIC_LIVE_CORRECTIONS_WHILE_RECORDING !== "false";
}

export function liveCorrectionIntervalSeconds(): number {
  if (isRecordingLowCpuMode()) {
    return 15;
  }
  return Number(process.env.NEXT_PUBLIC_LIVE_CORRECTION_INTERVAL_SECONDS ?? "6");
}

export function pcmProcessorBufferSize(): number {
  return isRecordingLowCpuMode() ? 8192 : 4096;
}

export function mediaRecorderTimesliceMs(): number {
  return isRecordingLowCpuMode() ? 2500 : 1000;
}

export function audioLevelMeterIntervalMs(): number {
  return isRecordingLowCpuMode() ? 200 : 100;
}

/**
 * Optional stagger before live STT connects (default 0 — transcription starts with recording).
 * Set NEXT_PUBLIC_LIVE_TRANSCRIPTION_DEFER_MS only if you need to trade a short gap for smoother UI.
 */
export function liveTranscriptionStartDelayMs(): number {
  if (process.env.NEXT_PUBLIC_LIVE_TRANSCRIPTION_DEFER_MS) {
    const parsed = Number(process.env.NEXT_PUBLIC_LIVE_TRANSCRIPTION_DEFER_MS);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return 0;
}

/** Delay level meters so the first paint after “Recording” stays smooth. */
export function audioLevelMeterStartDelayMs(): number {
  return isRecordingLowCpuMode() ? 800 : 400;
}
