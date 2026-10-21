export type PcmStreamHandle = {
  stop: () => void;
  sampleRate: number;
};

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i] ?? 0));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

/**
 * Streams mono PCM16 from a MediaStream for Deepgram live encoding=linear16.
 */
export function startPcmStreamFromMediaStream(
  stream: MediaStream,
  onPcmChunk: (pcm: ArrayBuffer, sampleRate: number) => void,
): PcmStreamHandle {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(2048, 1, 1);
  const silent = audioContext.createGain();
  silent.gain.value = 0;
  source.connect(processor);
  processor.connect(silent);
  silent.connect(audioContext.destination);

  void audioContext.resume();

  let stopped = false;

  processor.onaudioprocess = (event) => {
    if (stopped || audioContext.state !== "running") {
      return;
    }
    const channel = event.inputBuffer.getChannelData(0);
    const pcm16 = floatTo16BitPCM(channel);
    onPcmChunk(pcm16.buffer as ArrayBuffer, audioContext.sampleRate);
  };

  return {
    sampleRate: audioContext.sampleRate,
    stop: () => {
      if (stopped) {
        return;
      }
      stopped = true;
      processor.onaudioprocess = null;
      try {
        processor.disconnect();
      } catch {
        // Already disconnected.
      }
      try {
        silent.disconnect();
      } catch {
        // Already disconnected.
      }
      try {
        source.disconnect();
      } catch {
        // Already disconnected.
      }
      if (audioContext.state !== "closed") {
        void audioContext.close().catch(() => {
          // Ignore double-close races with effect teardown.
        });
      }
    },
  };
}
