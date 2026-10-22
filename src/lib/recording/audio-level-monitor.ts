import { audioLevelMeterIntervalMs } from "@/lib/recording/recording-performance";

export function createAudioLevelMonitor(stream: MediaStream, onLevel: (level: number) => void) {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 128;
  source.connect(analyser);

  const data = new Uint8Array(analyser.frequencyBinCount);
  let stopped = false;
  const intervalMs = audioLevelMeterIntervalMs();

  const tick = () => {
    if (stopped) {
      return;
    }
    analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
      sum += data[i] ?? 0;
    }
    onLevel(Math.min(1, sum / data.length / 90));
  };

  const timer = window.setInterval(tick, intervalMs);
  void audioContext.resume();

  return () => {
    stopped = true;
    window.clearInterval(timer);
    source.disconnect();
    if (audioContext.state !== "closed") {
      void audioContext.close().catch(() => {
        // Ignore double-close.
      });
    }
  };
}
