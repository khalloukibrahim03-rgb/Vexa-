import { pipeline, env } from '@xenova/transformers';

// Ensure single-threaded WASM execution to avoid COOP/COEP header requirements on mobile browsers
if (env && env.backends && env.backends.onnx && env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}

export interface TTSResult {
  audioBlob: Blob;
  audioUrl: string;
  durationSeconds: number;
  byteSize: number;
  samplingRate: number;
}

let synthesizerPipeline: any = null;

/**
 * Synthesizes spoken audio from text using single-threaded ONNX TTS (Xenova/mms-tts-eng) in browser.
 */
export async function synthesizeSpeech(text: string, modelName = 'Xenova/mms-tts-eng'): Promise<TTSResult> {
  if (!synthesizerPipeline) {
    synthesizerPipeline = await pipeline('text-to-speech', modelName, {
      quantized: true,
    });
  }

  const output = await synthesizerPipeline(text);
  const audioData: Float32Array = output.audio;
  const samplingRate: number = output.sampling_rate || 22050;

  // Calculate audio duration in seconds
  const durationSeconds = audioData.length / samplingRate;

  // Convert Float32 PCM to 16-bit PCM WAV Blob
  const wavBuffer = encodeWAV(audioData, samplingRate);
  const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });
  const audioUrl = URL.createObjectURL(audioBlob);

  return {
    audioBlob,
    audioUrl,
    durationSeconds,
    byteSize: audioBlob.size,
    samplingRate,
  };
}

/**
 * Helper function to encode raw Float32 audio samples into standard PCM WAV format.
 */
function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, 1, true);
  /* channel count (mono) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sampleRate * 2) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
