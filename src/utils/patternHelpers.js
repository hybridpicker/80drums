export const STEPS_PER_BAR = 16;
export const MAX_BARS = 4;

export const emptyPattern = (bars) => Array(bars * STEPS_PER_BAR).fill(0);

export function seed(indices, bars) {
  const arr = emptyPattern(bars);
  for (let b = 0; b < bars; b++) {
    indices.forEach((i) => (arr[b * STEPS_PER_BAR + i] = 1));
  }
  return arr;
}

export function every(n, bars) {
  const arr = emptyPattern(bars);
  for (let i = 0; i < arr.length; i += n) arr[i] = 1;
  return arr;
}

export function mix(a, b) {
  return a.map((v, i) => (v || b[i] ? 1 : 0));
}

export function resizePattern(prev, bars) {
  const newLen = bars * STEPS_PER_BAR;
  const next = emptyPattern(bars);
  for (let i = 0; i < Math.min(prev.length, newLen); i++) next[i] = prev[i];
  return next;
}

export const midiToFreq = (midiNote) => 440 * Math.pow(2, (midiNote - 69) / 12);

export const getNoteNameFromMidi = (midiNote) => {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}${octave}`;
};

// Track definitions with colors
export const TRACKS = [
  { id: 'kick', name: 'Kick', colorClass: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25' },
  { id: 'snare', name: 'Snare', colorClass: 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/25' },
  { id: 'hat', name: 'Hi-Hat', colorClass: 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/25' },
  { id: 'openhat', name: 'Open Hat', colorClass: 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25' },
  { id: 'clap', name: 'Clap', colorClass: 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/25' },
  { id: 'cymbal', name: 'Cymbal', colorClass: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25' },
  { id: 'tom', name: 'Tom', colorClass: 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/25' },
  { id: 'rim', name: 'Rimshot', colorClass: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25' },
];

// Accent color classes (ring for 3-state velocity)
export const ACCENT_RING = 'ring-2 ring-white/70 ring-inset';

// Presets generate patterns for all 8 tracks
export const presets = {
  "Classic 1": ({ bars }) => ({
    kick: seed([0, 8], bars),
    snare: seed([4, 12], bars),
    hat: every(2, bars),
    openhat: emptyPattern(bars),
    clap: emptyPattern(bars),
    cymbal: seed([0], bars),
    tom: emptyPattern(bars),
    rim: emptyPattern(bars),
  }),
  "Classic 2": ({ bars }) => ({
    kick: seed([0, 7, 8, 10, 15], bars),
    snare: seed([4, 12], bars),
    hat: every(1, bars),
    openhat: emptyPattern(bars),
    clap: emptyPattern(bars),
    cymbal: seed([0, 8], bars),
    tom: emptyPattern(bars),
    rim: emptyPattern(bars),
  }),
  "New Jack": ({ bars }) => ({
    kick: seed([0, 6, 8, 11], bars),
    snare: seed([4, 12], bars),
    hat: mix(every(1, bars), seed([3, 7, 11, 15], bars)),
    openhat: seed([6, 14], bars),
    clap: emptyPattern(bars),
    cymbal: seed([0, 14], bars),
    tom: emptyPattern(bars),
    rim: emptyPattern(bars),
  }),
  "Breakbeat": ({ bars }) => ({
    kick: seed([0, 10, 13], bars),
    snare: seed([4, 12], bars),
    hat: seed([2, 6, 9, 14], bars),
    openhat: seed([4, 12], bars),
    clap: emptyPattern(bars),
    cymbal: seed([0, 15], bars),
    tom: emptyPattern(bars),
    rim: seed([7], bars),
  }),
  "Four Floor": ({ bars }) => ({
    kick: every(4, bars),
    snare: seed([4, 12], bars),
    hat: every(1, bars),
    openhat: seed([2, 6, 10, 14], bars),
    clap: seed([4, 12], bars),
    cymbal: seed([0], bars),
    tom: emptyPattern(bars),
    rim: emptyPattern(bars),
  }),
  "Jungle": ({ bars }) => ({
    kick: seed([0, 3, 8, 11, 14], bars),
    snare: seed([4, 10, 12, 15], bars),
    hat: every(1, bars),
    openhat: seed([2, 10], bars),
    clap: emptyPattern(bars),
    cymbal: seed([0, 6, 8, 14], bars),
    tom: seed([6, 13], bars),
    rim: emptyPattern(bars),
  }),
  "Trap": ({ bars }) => ({
    kick: seed([0, 4, 8, 12], bars),
    snare: seed([6, 14], bars),
    hat: seed([1, 2, 3, 5, 7, 9, 10, 11, 13, 15], bars),
    openhat: seed([4, 12], bars),
    clap: seed([6, 14], bars),
    cymbal: seed([0, 8], bars),
    tom: emptyPattern(bars),
    rim: emptyPattern(bars),
  }),
  "Ambient": ({ bars }) => ({
    kick: seed([0, 12], bars),
    snare: seed([8], bars),
    hat: seed([4, 6, 10, 14], bars),
    openhat: seed([2], bars),
    clap: emptyPattern(bars),
    cymbal: seed([0, 7, 15], bars),
    tom: seed([4], bars),
    rim: seed([10], bars),
  }),
};

// Timing trainer preset configurations
export const TRAINER_PRESETS = {
  callResponse: { label: 'Call & Response', icon: '🎤', play: 2, silence: 2, desc: 'Hör zu, dann spiel weiter' },
  steadyGap: { label: 'Steady Gap', icon: '🕳️', play: 3, silence: 1, desc: 'Kurze Stille, halte den Groove' },
  deepDive: { label: 'Deep Dive', icon: '🏊', play: 2, silence: 4, desc: 'Wenig Referenz, viel Eigenarbeit' },
  checkIn: { label: 'Check-In', icon: '✅', play: 1, silence: 3, desc: 'Minimaler Check, maximale Unabhängigkeit' },
  fadeAway: { label: 'Fade Away', icon: '📉', play: null, silence: null, desc: 'Immer weniger Referenz' },
  custom: { label: 'Custom', icon: '⚙️', play: null, silence: null, desc: 'Eigene Einstellung' },
};
