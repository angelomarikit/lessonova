import {
  audioLevelMeterIntervalMs,
  pcmProcessorBufferSize,
} from "@/lib/recording/recording-performance";

export type MediaStreamAudioTap = {
  sampleRate: number;
  addPcmConsumer: (consumer: (pcm: ArrayBuffer) => void) => void;
  removePcmConsumer: (consumer: (pcm: ArrayBuffer) => void) => void;
  stop: () => void;
};

/**
 * One AudioContext per MediaStream — shared level meter + live PCM consumers.
 */
export function createMediaStreamAudioTap(options: {
  stream: MediaStream;
  onLevel?: (level: number) => void;
}): MediaStreamAudioTap {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(options.stream);
  const silent = audioContext.createGain();
  silent.gain.value = 0;
  const pcmConsumers = new Set<(pcm: ArrayBuffer) => void>();

  let stopped = false;
  let levelTimer: number | null = null;
  let processor: ScriptProcessorNode | null = null;

  const ensureProcessor = () => {
    if (processor || stopped) {
      return;
    }
    processor = audioContext.createScriptProcessor(pcmProcessorBufferSize(), 1, 1);
    source.connect(processor);
    processor.connect(silent);
    processor.onaudioprocess = (event) => {
      if (stopped || audioContext.state !== "running" || pcmConsumers.size === 0) {
        return;
      }
      const channel = event.inputBuffer.getChannelData(0);
      const pcm16 = floatTo16BitPCM(channel);
      const buffer = pcm16.buffer as ArrayBuffer;
      for (const consumer of pcmConsumers) {
        consumer(buffer);
      }
    };
  };

  source.connect(silent);
  silent.connect(audioContext.destination);

  if (options.onLevel) {
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const onLevel = options.onLevel;
    levelTimer = window.setInterval(() => {
      if (stopped) {
        return;
      }
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        sum += data[i] ?? 0;
      }
      onLevel(Math.min(1, sum / data.length / 90));
    }, audioLevelMeterIntervalMs());
  }

  void audioContext.resume();

  return {
    sampleRate: audioContext.sampleRate,
    addPcmConsumer: (consumer) => {
      pcmConsumers.add(consumer);
      ensureProcessor();
    },
    removePcmConsumer: (consumer) => {
      pcmConsumers.delete(consumer);
    },
    stop: () => {
      if (stopped) {
        return;
      }
      stopped = true;
      pcmConsumers.clear();
      if (levelTimer) {
        window.clearInterval(levelTimer);
      }
      if (processor) {
        processor.onaudioprocess = null;
        processor.disconnect();
      }
      try {
        source.disconnect();
        silent.disconnect();
      } catch {
        // Already disconnected.
      }
      if (audioContext.state !== "closed") {
        void audioContext.close().catch(() => {
          // Ignore double-close.
        });
      }
    },
  };
}

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i] ?? 0));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}
