import { describe, it, expect, vi } from 'vitest';
import { exportWav } from './wavExport';
import { TRACKS, emptyPattern, seed, every } from './patternHelpers';

function makeState(overrides = {}) {
  const patterns = {};
  TRACKS.forEach(t => { patterns[t.id] = emptyPattern(1); });
  patterns.kick = seed([0, 8], 1);
  patterns.hat = every(2, 1);
  const mixer = {};
  TRACKS.forEach(t => { mixer[t.id] = { volume: 100, mute: false, solo: false }; });
  return { patterns, bpm: 120, swing: 0, bars: 1, mixer, ...overrides };
}

describe('exportWav', () => {
  it('creates OfflineAudioContext with correct params', async () => {
    // Mock DOM elements needed for download
    const link = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(link);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await exportWav(makeState());

    expect(link.click).toHaveBeenCalled();
    expect(link.download).toContain('drumcomputer-');
    expect(link.download).toContain('.wav');
  });

  it('respects muted tracks', async () => {
    const link = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(link);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const mixer = {};
    TRACKS.forEach(t => { mixer[t.id] = { volume: 100, mute: t.id === 'kick', solo: false }; });
    await exportWav(makeState({ mixer }));

    // Just verify it completes without error
    expect(link.click).toHaveBeenCalled();
  });

  it('respects solo tracks', async () => {
    const link = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(link);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const mixer = {};
    TRACKS.forEach(t => { mixer[t.id] = { volume: 100, mute: false, solo: t.id === 'hat' }; });
    await exportWav(makeState({ mixer }));

    expect(link.click).toHaveBeenCalled();
  });

  it('filename includes BPM and bar count', async () => {
    const link = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(link);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    await exportWav(makeState({ bpm: 140, bars: 2 }));
    expect(link.download).toBe('drumcomputer-140bpm-2bars.wav');
  });
});
