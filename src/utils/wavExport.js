import { TRACKS, STEPS_PER_BAR } from './patternHelpers';
import { triggerMap } from '../audio/DrumSynths';

export async function exportWav(state) {
  const { patterns, bpm, swing, bars, mixer } = state;
  const totalSteps = bars * STEPS_PER_BAR;
  const sixteenth = (60 / bpm) / 4;
  const duration = totalSteps * sixteenth + 0.5; // extra tail for decay
  const sampleRate = 44100;
  const numSamples = Math.ceil(duration * sampleRate);

  const offCtx = new OfflineAudioContext(2, numSamples, sampleRate);

  // Create per-track gain nodes
  const trackGains = {};
  const masterGain = offCtx.createGain();
  masterGain.gain.value = 1.0;
  masterGain.connect(offCtx.destination);

  TRACKS.forEach(t => {
    const g = offCtx.createGain();
    const vol = (mixer?.[t.id]?.volume ?? 100) / 100;
    g.gain.value = vol;
    g.connect(masterGain);
    trackGains[t.id] = g;
  });

  // Determine solo state
  const hasSolo = mixer ? Object.values(mixer).some(m => m.solo) : false;

  // Schedule all notes
  for (let step = 0; step < totalSteps; step++) {
    const isOffbeat = step % 2 === 1;
    const swingPct = (swing || 0) / 100;
    const swingOffset = isOffbeat ? swingPct * sixteenth * 0.5 : 0;
    const time = step * sixteenth + swingOffset;

    TRACKS.forEach(t => {
      const pat = patterns[t.id];
      if (!pat || step >= pat.length) return;
      const val = pat[step];
      if (!val) return;

      const mx = mixer?.[t.id];
      if (mx?.mute) return;
      if (hasSolo && !mx?.solo) return;

      const trigger = triggerMap[t.id];
      if (trigger) trigger(offCtx, trackGains[t.id], time, val);
    });
  }

  // Render
  const buffer = await offCtx.startRendering();

  // Convert to WAV
  const wav = audioBufferToWav(buffer);
  const blob = new Blob([wav], { type: 'audio/wav' });

  // Download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `drumcomputer-${bpm}bpm-${bars}bar${bars > 1 ? 's' : ''}.wav`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const samples = interleave(buffer);
  const dataLength = samples.length * bytesPerSample;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Write samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, val, true);
    offset += 2;
  }

  return arrayBuffer;
}

function interleave(buffer) {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
  const result = new Float32Array(left.length * 2);
  for (let i = 0; i < left.length; i++) {
    result[i * 2] = left[i];
    result[i * 2 + 1] = right[i];
  }
  return result;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
