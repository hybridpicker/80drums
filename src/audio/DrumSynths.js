// Cached noise buffers - created once per AudioContext
let noiseCache = null;
let noiseCacheCtx = null;

function ensureNoiseCache(ctx) {
  if (noiseCacheCtx === ctx && noiseCache) return;
  noiseCacheCtx = ctx;
  const sr = ctx.sampleRate;
  const makeBuffer = (seconds) => {
    const buf = ctx.createBuffer(1, seconds * sr, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  };
  noiseCache = {
    short: makeBuffer(0.1),   // hats, rimshot
    medium: makeBuffer(0.3),  // snare, clap
    long: makeBuffer(2.0),    // cymbal
  };
}

function noiseSource(ctx, type) {
  ensureNoiseCache(ctx);
  const src = ctx.createBufferSource();
  src.buffer = noiseCache[type];
  return src;
}

// velocity: 1 = normal, 2 = accent (1.5x)
export function velGain(velocity) {
  return velocity === 2 ? 1.5 : 1.0;
}

// Per-voice params: { tune: 0 (semitones), decay: 1.0 (multiplier) }
export function getTune(params) { return params?.tune ? Math.pow(2, params.tune / 12) : 1.0; }
export function getDecay(params) { return params?.decay ?? 1.0; }

export function triggerKick(ctx, dest, time, velocity = 1, params) {
  const v = velGain(velocity);
  const tune = getTune(params);
  const decay = getDecay(params);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120 * tune, time);
  osc.frequency.exponentialRampToValueAtTime(40 * tune, time + 0.15 * decay);
  gain.gain.setValueAtTime(0.9 * v, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18 * decay);
  osc.connect(gain).connect(dest);
  osc.start(time);
  osc.stop(time + 0.2 * decay);
}

export function triggerSnare(ctx, dest, time, velocity = 1, params) {
  const v = velGain(velocity);
  const tune = getTune(params);
  const decay = getDecay(params);
  const noise = noiseSource(ctx, 'medium');
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "highpass";
  noiseFilter.frequency.value = 800 * tune;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.6 * v, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15 * decay);
  noise.connect(noiseFilter).connect(noiseGain).connect(dest);

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(0.3 * v, time);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12 * decay);
  osc.frequency.setValueAtTime(180 * tune, time);
  osc.connect(bodyGain).connect(dest);

  noise.start(time);
  noise.stop(time + 0.25 * decay);
  osc.start(time);
  osc.stop(time + 0.15 * decay);
}

export function triggerHat(ctx, dest, time, velocity = 1, params) {
  const v = velGain(velocity);
  const tune = getTune(params);
  const decay = getDecay(params);
  const noise = noiseSource(ctx, 'short');
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 8000 * tune;
  bp.Q.value = 0.7;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.25 * v, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07 * decay);
  noise.connect(bp).connect(gain).connect(dest);
  noise.start(time);
  noise.stop(time + 0.08 * decay);
}

export function triggerOpenHat(ctx, dest, time, velocity = 1, params) {
  const v = velGain(velocity);
  const tune = getTune(params);
  const decay = getDecay(params);
  const noise = noiseSource(ctx, 'medium');
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 8000 * tune;
  bp.Q.value = 0.5;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3 * v, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2 * decay);
  noise.connect(bp).connect(gain).connect(dest);
  noise.start(time);
  noise.stop(time + 0.25 * decay);
}

export function triggerClap(ctx, dest, time, velocity = 1, params) {
  const v = velGain(velocity);
  const tune = getTune(params);
  const decay = getDecay(params);
  for (let burst = 0; burst < 4; burst++) {
    const t = time + burst * 0.025;
    const noise = noiseSource(ctx, 'short');
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2000 * tune;
    bp.Q.value = 1.5;
    const gain = ctx.createGain();
    const amp = (burst === 3 ? 0.5 : 0.3) * v;
    gain.gain.setValueAtTime(amp, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.015 * decay);
    noise.connect(bp).connect(gain).connect(dest);
    noise.start(t);
    noise.stop(t + 0.02 * decay);
  }
  const tail = noiseSource(ctx, 'short');
  const tailBp = ctx.createBiquadFilter();
  tailBp.type = "bandpass";
  tailBp.frequency.value = 1500 * tune;
  tailBp.Q.value = 0.8;
  const tailGain = ctx.createGain();
  tailGain.gain.setValueAtTime(0.35 * v, time + 0.075);
  tailGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15 * decay);
  tail.connect(tailBp).connect(tailGain).connect(dest);
  tail.start(time + 0.075);
  tail.stop(time + 0.2 * decay);
}

export function triggerCymbal(ctx, dest, time, velocity = 1, params) {
  const v = velGain(velocity);
  const tune = getTune(params);
  const decay = getDecay(params);
  const noise = noiseSource(ctx, 'long');
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 3000 * tune;
  highpass.Q.value = 0.5;
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 10000 * tune;
  bandpass.Q.value = 2;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4 * v, time);
  gain.gain.exponentialRampToValueAtTime(0.2 * v, time + 0.1 * decay);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 1.5 * decay);
  noise.connect(highpass).connect(bandpass).connect(gain).connect(dest);
  noise.start(time);
  noise.stop(time + 2.0 * decay);
}

export function triggerTom(ctx, dest, time, velocity = 1, params) {
  const v = velGain(velocity);
  const tune = getTune(params);
  const decay = getDecay(params);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(200 * tune, time);
  osc.frequency.exponentialRampToValueAtTime(80 * tune, time + 0.15 * decay);
  gain.gain.setValueAtTime(0.7 * v, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15 * decay);
  osc.connect(gain).connect(dest);
  osc.start(time);
  osc.stop(time + 0.18 * decay);
}

export function triggerRimshot(ctx, dest, time, velocity = 1, params) {
  const v = velGain(velocity);
  const tune = getTune(params);
  const decay = getDecay(params);
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(800 * tune, time);
  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.5 * v, time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03 * decay);
  osc.connect(oscGain).connect(dest);
  osc.start(time);
  osc.stop(time + 0.05 * decay);
  const noise = noiseSource(ctx, 'short');
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2000 * tune;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.4 * v, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04 * decay);
  noise.connect(hp).connect(noiseGain).connect(dest);
  noise.start(time);
  noise.stop(time + 0.05 * decay);
}

// Map track IDs to trigger functions
export const triggerMap = {
  kick: triggerKick,
  snare: triggerSnare,
  hat: triggerHat,
  openhat: triggerOpenHat,
  clap: triggerClap,
  cymbal: triggerCymbal,
  tom: triggerTom,
  rim: triggerRimshot,
};
