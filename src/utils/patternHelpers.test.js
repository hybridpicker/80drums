import { describe, it, expect } from 'vitest';
import {
  STEPS_PER_BAR, MAX_BARS, TRACKS,
  emptyPattern, seed, every, mix, resizePattern,
  midiToFreq, getNoteNameFromMidi,
  presets, TRAINER_PRESETS,
} from './patternHelpers';

// ── Constants ──

describe('Constants', () => {
  it('STEPS_PER_BAR is 16', () => {
    expect(STEPS_PER_BAR).toBe(16);
  });

  it('MAX_BARS is 4', () => {
    expect(MAX_BARS).toBe(4);
  });

  it('TRACKS has 8 entries', () => {
    expect(TRACKS).toHaveLength(8);
  });

  it('every TRACK has id, name, and colorClass', () => {
    TRACKS.forEach(t => {
      expect(t).toHaveProperty('id');
      expect(t).toHaveProperty('name');
      expect(t).toHaveProperty('colorClass');
    });
  });

  it('TRACK ids are unique', () => {
    const ids = TRACKS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── emptyPattern ──

describe('emptyPattern', () => {
  it('creates correct length for 1 bar', () => {
    const p = emptyPattern(1);
    expect(p).toHaveLength(16);
  });

  it('creates correct length for 4 bars', () => {
    const p = emptyPattern(4);
    expect(p).toHaveLength(64);
  });

  it('all values are 0', () => {
    const p = emptyPattern(2);
    expect(p.every(v => v === 0)).toBe(true);
  });
});

// ── seed ──

describe('seed', () => {
  it('sets hits at specified indices', () => {
    const p = seed([0, 4, 8], 1);
    expect(p[0]).toBe(1);
    expect(p[4]).toBe(1);
    expect(p[8]).toBe(1);
    expect(p[1]).toBe(0);
  });

  it('repeats across bars', () => {
    const p = seed([0, 4], 2);
    expect(p[0]).toBe(1);
    expect(p[4]).toBe(1);
    expect(p[16]).toBe(1);
    expect(p[20]).toBe(1);
  });

  it('non-hit indices are 0', () => {
    const p = seed([0], 1);
    expect(p.filter(v => v === 1)).toHaveLength(1);
    expect(p.filter(v => v === 0)).toHaveLength(15);
  });
});

// ── every ──

describe('every', () => {
  it('every(4) places hits every 4 steps', () => {
    const p = every(4, 1);
    expect(p[0]).toBe(1);
    expect(p[4]).toBe(1);
    expect(p[8]).toBe(1);
    expect(p[12]).toBe(1);
    expect(p[1]).toBe(0);
  });

  it('every(1) fills all steps', () => {
    const p = every(1, 1);
    expect(p.every(v => v === 1)).toBe(true);
  });

  it('every(2) for 2 bars has correct length and hit count', () => {
    const p = every(2, 2);
    expect(p).toHaveLength(32);
    expect(p.filter(v => v === 1)).toHaveLength(16);
  });
});

// ── mix ──

describe('mix', () => {
  it('OR-combines two patterns', () => {
    const a = [1, 0, 0, 1];
    const b = [0, 1, 0, 1];
    expect(mix(a, b)).toEqual([1, 1, 0, 1]);
  });

  it('empty patterns produce empty result', () => {
    const a = [0, 0, 0, 0];
    const b = [0, 0, 0, 0];
    expect(mix(a, b)).toEqual([0, 0, 0, 0]);
  });

  it('full patterns produce full result', () => {
    const a = [1, 1, 1, 1];
    const b = [1, 1, 1, 1];
    expect(mix(a, b)).toEqual([1, 1, 1, 1]);
  });
});

// ── resizePattern ──

describe('resizePattern', () => {
  it('expands pattern (1 bar → 2 bars)', () => {
    const p = seed([0, 4], 1);
    const resized = resizePattern(p, 2);
    expect(resized).toHaveLength(32);
    expect(resized[0]).toBe(1);
    expect(resized[4]).toBe(1);
    expect(resized[16]).toBe(0); // new bar is empty
  });

  it('shrinks pattern (2 bars → 1 bar)', () => {
    const p = seed([0, 4], 2);
    const resized = resizePattern(p, 1);
    expect(resized).toHaveLength(16);
    expect(resized[0]).toBe(1);
    expect(resized[4]).toBe(1);
  });

  it('same size preserves data', () => {
    const p = seed([0, 8], 2);
    const resized = resizePattern(p, 2);
    expect(resized).toEqual(p);
  });
});

// ── midiToFreq ──

describe('midiToFreq', () => {
  it('A4 (69) = 440 Hz', () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 2);
  });

  it('A3 (57) = 220 Hz', () => {
    expect(midiToFreq(57)).toBeCloseTo(220, 2);
  });

  it('C4 (60) ≈ 261.63 Hz', () => {
    expect(midiToFreq(60)).toBeCloseTo(261.63, 1);
  });

  it('octave up doubles frequency', () => {
    const f1 = midiToFreq(60);
    const f2 = midiToFreq(72);
    expect(f2).toBeCloseTo(f1 * 2, 2);
  });
});

// ── getNoteNameFromMidi ──

describe('getNoteNameFromMidi', () => {
  it('A4 = midi 69', () => {
    expect(getNoteNameFromMidi(69)).toBe('A4');
  });

  it('C4 = midi 60', () => {
    expect(getNoteNameFromMidi(60)).toBe('C4');
  });

  it('C#3 = midi 49', () => {
    expect(getNoteNameFromMidi(49)).toBe('C#3');
  });

  it('B0 = midi 23', () => {
    expect(getNoteNameFromMidi(23)).toBe('B0');
  });
});

// ── presets ──

describe('presets', () => {
  const presetNames = Object.keys(presets);

  it('has 8 presets', () => {
    expect(presetNames).toHaveLength(8);
  });

  presetNames.forEach(name => {
    it(`"${name}" returns valid pattern object`, () => {
      const result = presets[name]({ bars: 2 });
      expect(result).toBeDefined();
      TRACKS.forEach(t => {
        expect(result[t.id]).toBeDefined();
        expect(result[t.id]).toHaveLength(32);
        result[t.id].forEach(v => {
          expect(v === 0 || v === 1).toBe(true);
        });
      });
    });
  });
});

// ── TRAINER_PRESETS ──

describe('TRAINER_PRESETS', () => {
  it('has 6 presets', () => {
    expect(Object.keys(TRAINER_PRESETS)).toHaveLength(6);
  });

  it('each preset has label, icon, desc', () => {
    Object.values(TRAINER_PRESETS).forEach(p => {
      expect(p).toHaveProperty('label');
      expect(p).toHaveProperty('icon');
      expect(p).toHaveProperty('desc');
    });
  });
});
