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
