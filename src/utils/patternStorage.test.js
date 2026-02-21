import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveToSlot, loadFromSlot, getSlots, deleteSlot,
  autoSave, autoLoad,
  encodeToUrl, decodeFromUrl,
  getShareUrl, loadFromUrlHash,
} from './patternStorage';
import { TRACKS, emptyPattern, seed, every } from './patternHelpers';

function makeState(overrides = {}) {
  const patterns = {};
  TRACKS.forEach(t => { patterns[t.id] = emptyPattern(2); });
  patterns.kick = seed([0, 8], 2);
  patterns.hat = every(2, 2);
  return {
    patterns,
    bpm: 120,
    swing: 15,
    bars: 2,
    mixer: {},
    droneEnabled: false,
    droneNote: 33,
    ...overrides,
  };
}

// ── getSlots ──

describe('getSlots', () => {
  it('returns 8 null slots when empty', () => {
    const slots = getSlots();
    expect(slots).toHaveLength(8);
    expect(slots.every(s => s === null)).toBe(true);
  });

  it('pads to 8 if fewer stored', () => {
    localStorage.setItem('drumcomputer_slots', JSON.stringify([null, null]));
    const slots = getSlots();
    expect(slots).toHaveLength(8);
  });

  it('returns 8 nulls on corrupt JSON', () => {
    localStorage.setItem('drumcomputer_slots', '{corrupt');
    const slots = getSlots();
    expect(slots).toHaveLength(8);
    expect(slots.every(s => s === null)).toBe(true);
  });
});

// ── saveToSlot / loadFromSlot ──

describe('saveToSlot / loadFromSlot', () => {
  it('round-trips state correctly', () => {
    const state = makeState();
    saveToSlot(0, state);
    const loaded = loadFromSlot(0);
    expect(loaded).toBeDefined();
    expect(loaded.bpm).toBe(120);
    expect(loaded.swing).toBe(15);
    expect(loaded.bars).toBe(2);
    expect(loaded.patterns.kick).toEqual(state.patterns.kick);
  });

  it('returns null for empty slot', () => {
    expect(loadFromSlot(5)).toBeNull();
  });

  it('saveToSlot returns true on success', () => {
    expect(saveToSlot(0, makeState())).toBe(true);
  });

  it('stores name and timestamp', () => {
    const state = makeState({ name: 'My Beat' });
    saveToSlot(3, state);
    const slots = getSlots();
    expect(slots[3].name).toBe('My Beat');
    expect(slots[3].timestamp).toBeGreaterThan(0);
  });
});

// ── deleteSlot ──

describe('deleteSlot', () => {
  it('removes a saved slot', () => {
    saveToSlot(2, makeState());
    expect(loadFromSlot(2)).not.toBeNull();
    deleteSlot(2);
    expect(loadFromSlot(2)).toBeNull();
  });
});

// ── autoSave / autoLoad ──

describe('autoSave / autoLoad', () => {
  it('round-trips state', () => {
    const state = makeState({ bpm: 140, swing: 30 });
    autoSave(state);
    const loaded = autoLoad();
    expect(loaded.bpm).toBe(140);
    expect(loaded.swing).toBe(30);
    expect(loaded.patterns.kick).toEqual(state.patterns.kick);
  });

  it('returns null when nothing saved', () => {
    expect(autoLoad()).toBeNull();
  });

  it('returns null on corrupt data', () => {
    localStorage.setItem('drumcomputer_patterns', 'not-json');
    expect(autoLoad()).toBeNull();
  });
});

// ── encodeToUrl / decodeFromUrl ──

describe('encodeToUrl / decodeFromUrl', () => {
  it('round-trips patterns and settings', () => {
    const state = makeState({ bpm: 110, swing: 20 });
    const encoded = encodeToUrl(state);
    const decoded = decodeFromUrl(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded.bpm).toBe(110);
    expect(decoded.swing).toBe(20);
    expect(decoded.bars).toBe(2);
    expect(decoded.patterns.kick).toEqual(state.patterns.kick);
  });

  it('encodes accent values with +1000 offset', () => {
    const state = makeState();
    state.patterns.kick[0] = 2; // accent
    const encoded = encodeToUrl(state);
    const decoded = decodeFromUrl(encoded);
    expect(decoded.patterns.kick[0]).toBe(2);
  });

  it('preserves empty tracks', () => {
    const state = makeState();
    const encoded = encodeToUrl(state);
    const decoded = decodeFromUrl(encoded);
    // clap is empty in makeState
    expect(decoded.patterns.clap.every(v => v === 0)).toBe(true);
  });

  it('returns null for invalid base64', () => {
    expect(decodeFromUrl('!!invalid!!')).toBeNull();
  });

  it('returns null for corrupt JSON inside base64', () => {
    const broken = btoa('not-json');
    expect(decodeFromUrl(broken)).toBeNull();
  });
});

// ── getShareUrl ──

describe('getShareUrl', () => {
  it('returns URL with hash', () => {
    const state = makeState();
    const url = getShareUrl(state);
    expect(url).toContain('#');
  });
});

// ── loadFromUrlHash ──

describe('loadFromUrlHash', () => {
  it('returns null when no hash', () => {
    window.location.hash = '';
    expect(loadFromUrlHash()).toBeNull();
  });

  it('decodes state from hash', () => {
    const state = makeState({ bpm: 130 });
    const encoded = encodeToUrl(state);
    window.location.hash = `#${encoded}`;
    const loaded = loadFromUrlHash();
    expect(loaded).not.toBeNull();
    expect(loaded.bpm).toBe(130);
    window.location.hash = '';
  });
});
