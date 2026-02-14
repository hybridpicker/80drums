import { TRACKS, STEPS_PER_BAR, emptyPattern } from './patternHelpers';

const STORAGE_KEY = 'drumcomputer_patterns';
const SLOTS_KEY = 'drumcomputer_slots';

// ── LocalStorage Save/Load ──

export function saveToSlot(slotIndex, state) {
  const slots = getSlots();
  slots[slotIndex] = {
    name: state.name || `Pattern ${slotIndex + 1}`,
    timestamp: Date.now(),
    data: {
      patterns: state.patterns,
      bpm: state.bpm,
      swing: state.swing,
      bars: state.bars,
      mixer: state.mixer,
      droneEnabled: state.droneEnabled,
      droneNote: state.droneNote,
    },
  };
  try {
    localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
    return true;
  } catch {
    return false;
  }
}

export function loadFromSlot(slotIndex) {
  const slots = getSlots();
  return slots[slotIndex]?.data || null;
}

export function getSlots() {
  try {
    const raw = localStorage.getItem(SLOTS_KEY);
    if (!raw) return Array(8).fill(null);
    const parsed = JSON.parse(raw);
    // Ensure we always have 8 slots
    while (parsed.length < 8) parsed.push(null);
    return parsed;
  } catch {
    return Array(8).fill(null);
  }
}

export function deleteSlot(slotIndex) {
  const slots = getSlots();
  slots[slotIndex] = null;
  try {
    localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
    return true;
  } catch {
    return false;
  }
}

// ── Auto-save last state ──

export function autoSave(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      patterns: state.patterns,
      bpm: state.bpm,
      swing: state.swing,
      bars: state.bars,
      mixer: state.mixer,
      droneEnabled: state.droneEnabled,
      droneNote: state.droneNote,
    }));
  } catch { /* ignore */ }
}

export function autoLoad() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── URL Sharing ──
// Compact encoding: base64 of JSON with short keys

export function encodeToUrl(state) {
  const compact = {
    p: {},  // patterns (compressed: only non-zero steps)
    b: state.bpm,
    s: state.swing,
    n: state.bars,
  };
  TRACKS.forEach(t => {
    const pat = state.patterns[t.id];
    if (!pat) return;
    // Only encode tracks that have active steps
    const active = [];
    pat.forEach((v, i) => { if (v > 0) active.push(i + (v === 2 ? 1000 : 0)); });
    if (active.length > 0) compact.p[t.id] = active;
  });
  const json = JSON.stringify(compact);
  const encoded = btoa(encodeURIComponent(json));
  return encoded;
}

export function decodeFromUrl(hash) {
  try {
    const json = decodeURIComponent(atob(hash));
    const compact = JSON.parse(json);
    const bars = compact.n || 2;
    const patterns = {};
    TRACKS.forEach(t => {
      patterns[t.id] = emptyPattern(bars);
    });
    // Restore patterns
    if (compact.p) {
      Object.entries(compact.p).forEach(([trackId, active]) => {
        if (!patterns[trackId]) return;
        active.forEach(v => {
          const isAccent = v >= 1000;
          const idx = isAccent ? v - 1000 : v;
          if (idx < patterns[trackId].length) {
            patterns[trackId][idx] = isAccent ? 2 : 1;
          }
        });
      });
    }
    return {
      patterns,
      bpm: compact.b || 100,
      swing: compact.s || 0,
      bars,
    };
  } catch {
    return null;
  }
}

export function getShareUrl(state) {
  const encoded = encodeToUrl(state);
  return `${window.location.origin}${window.location.pathname}#${encoded}`;
}

export function loadFromUrlHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  return decodeFromUrl(hash);
}
