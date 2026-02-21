import { describe, it, expect } from 'vitest';
import {
  triggerMap, velGain, getTune, getDecay,
  triggerKick, triggerSnare, triggerHat, triggerOpenHat,
  triggerClap, triggerCymbal, triggerTom, triggerRimshot,
} from './DrumSynths';

describe('DrumSynths', () => {
  // ── Helper exports ──

  describe('velGain', () => {
    it('returns 1.0 for normal velocity (1)', () => {
      expect(velGain(1)).toBe(1.0);
    });

    it('returns 1.5 for accent velocity (2)', () => {
      expect(velGain(2)).toBe(1.5);
    });

    it('returns 1.0 for undefined velocity', () => {
      expect(velGain(undefined)).toBe(1.0);
    });
  });

  describe('getTune', () => {
    it('returns 1.0 for no params', () => {
      expect(getTune(undefined)).toBe(1.0);
      expect(getTune(null)).toBe(1.0);
    });

    it('returns 1.0 for tune=0', () => {
      expect(getTune({ tune: 0 })).toBe(1.0);
    });

    it('returns 2.0 for tune=12 (one octave up)', () => {
      expect(getTune({ tune: 12 })).toBeCloseTo(2.0, 5);
    });

    it('returns 0.5 for tune=-12 (one octave down)', () => {
      expect(getTune({ tune: -12 })).toBeCloseTo(0.5, 5);
    });
  });

  describe('getDecay', () => {
    it('returns 1.0 for no params', () => {
      expect(getDecay(undefined)).toBe(1.0);
      expect(getDecay(null)).toBe(1.0);
    });

    it('returns specified decay value', () => {
      expect(getDecay({ decay: 0.5 })).toBe(0.5);
      expect(getDecay({ decay: 2.0 })).toBe(2.0);
    });
  });

  // ── triggerMap ──

  describe('triggerMap', () => {
    it('has all 8 track IDs', () => {
      const expectedIds = ['kick', 'snare', 'hat', 'openhat', 'clap', 'cymbal', 'tom', 'rim'];
      expectedIds.forEach(id => {
        expect(triggerMap[id]).toBeDefined();
        expect(typeof triggerMap[id]).toBe('function');
      });
    });
  });

  // ── Trigger functions run without errors ──

  describe('trigger functions', () => {
    function makeMockCtx() {
      const ctx = new AudioContext();
      // Need noise cache to exist for snare/hat/etc
      // We create a buffer that getChannelData returns a Float32Array
      ctx.createBuffer = (numChannels, length, sampleRate) => {
        const channels = [];
        for (let i = 0; i < numChannels; i++) channels.push(new Float32Array(length));
        return {
          numberOfChannels: numChannels,
          length,
          sampleRate,
          getChannelData: (ch) => channels[ch],
        };
      };
      return ctx;
    }

    const triggers = [
      ['triggerKick', triggerKick],
      ['triggerSnare', triggerSnare],
      ['triggerHat', triggerHat],
      ['triggerOpenHat', triggerOpenHat],
      ['triggerClap', triggerClap],
      ['triggerCymbal', triggerCymbal],
      ['triggerTom', triggerTom],
      ['triggerRimshot', triggerRimshot],
    ];

    triggers.forEach(([name, fn]) => {
      it(`${name} runs without error`, () => {
        const ctx = makeMockCtx();
        const dest = ctx.createGain();
        expect(() => fn(ctx, dest, 0, 1)).not.toThrow();
      });

      it(`${name} runs with accent velocity`, () => {
        const ctx = makeMockCtx();
        const dest = ctx.createGain();
        expect(() => fn(ctx, dest, 0, 2)).not.toThrow();
      });

      it(`${name} runs with voice params`, () => {
        const ctx = makeMockCtx();
        const dest = ctx.createGain();
        expect(() => fn(ctx, dest, 0, 1, { tune: 3, decay: 1.5 })).not.toThrow();
      });
    });
  });
});
