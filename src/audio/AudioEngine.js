import { TRACKS } from '../utils/patternHelpers';

export function createAudioEngine() {
  let ctx = null;
  const trackGains = {};  // per-track GainNode
  let masterGain = null;

  // Effects chain: trackGains → masterGain → compressor → reverbMix → destination
  let compressor = null;
  let reverbConvolver = null;
  let reverbGain = null;   // wet
  let dryGain = null;       // dry
  let reverbMix = 0;        // 0-100

  async function ensureContext() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();

      masterGain = ctx.createGain();
      masterGain.gain.value = 1.0;

      // Compressor
      compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.knee.value = 10;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.15;

      // Dry path
      dryGain = ctx.createGain();
      dryGain.gain.value = 1.0;

      // Reverb (convolver + wet gain)
      reverbConvolver = ctx.createConvolver();
      reverbGain = ctx.createGain();
      reverbGain.gain.value = 0; // default: no reverb

      // Generate impulse response
      reverbConvolver.buffer = createReverbIR(ctx, 1.5, 3.0);

      // Signal chain: masterGain → compressor → dry + reverb → destination
      masterGain.connect(compressor);
      compressor.connect(dryGain);
      compressor.connect(reverbConvolver);
      reverbConvolver.connect(reverbGain);
      dryGain.connect(ctx.destination);
      reverbGain.connect(ctx.destination);

      // Create per-track gain nodes
      TRACKS.forEach(t => {
        const g = ctx.createGain();
        g.gain.value = 1.0;
        g.connect(masterGain);
        trackGains[t.id] = g;
      });
    }
    if (ctx.state === 'suspended') await ctx.resume();
    return ctx;
  }

  function getContext() { return ctx; }
  function getMasterGain() { return masterGain; }
  function getTrackGain(trackId) { return trackGains[trackId]; }

  function setTrackVolume(trackId, volume) {
    if (trackGains[trackId]) trackGains[trackId].gain.value = volume / 100;
  }

  function setMasterVolume(volume) {
    if (masterGain) masterGain.gain.value = volume / 100;
  }

  function setReverbMix(mix) {
    // mix: 0-100
    reverbMix = mix;
    if (reverbGain && dryGain) {
      const wet = mix / 100;
      reverbGain.gain.value = wet * 0.6; // cap reverb level
      dryGain.gain.value = 1.0 - wet * 0.3; // slight dry reduction
    }
  }

  function setCompressorThreshold(threshold) {
    if (compressor) compressor.threshold.value = threshold;
  }

  function setCompressorRatio(ratio) {
    if (compressor) compressor.ratio.value = ratio;
  }

  function getCompressor() { return compressor; }

  return {
    ensureContext, getContext, getMasterGain, getTrackGain,
    setTrackVolume, setMasterVolume,
    setReverbMix, setCompressorThreshold, setCompressorRatio, getCompressor,
  };
}

// Generate a simple reverb impulse response
function createReverbIR(ctx, decay, duration) {
  const sr = ctx.sampleRate;
  const len = Math.ceil(duration * sr);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}
