export function createAudioLevelMonitor(stream: MediaStream, onLevel: (level: number) => void) {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  const data = new Uint8Array(analyser.frequencyBinCount);
  let frame = 0;
  let stopped = false;

  const tick = () => {
    if (stopped) {
      return;
    }
    analyser.getByteFrequencyData(data);
    const average = data.reduce((sum, value) => sum + value, 0) / data.length;
    onLevel(Math.min(1, average / 90));
    frame = window.requestAnimationFrame(tick);
  };

  frame = window.requestAnimationFrame(tick);

  return () => {
    stopped = true;
    window.cancelAnimationFrame(frame);
    source.disconnect();
    void audioContext.close();
  };
}
