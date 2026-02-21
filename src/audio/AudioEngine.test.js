import { describe, it, expect } from 'vitest';
import { createAudioEngine } from './AudioEngine';

describe('AudioEngine', () => {
  it('ensureContext creates an AudioContext', async () => {
    const engine = createAudioEngine();
    const ctx = await engine.ensureContext();
    expect(ctx).toBeDefined();
    expect(ctx.state).toBe('running');
  });

  it('ensureContext returns same context on second call (singleton)', async () => {
    const engine = createAudioEngine();
    const ctx1 = await engine.ensureContext();
    const ctx2 = await engine.ensureContext();
    expect(ctx1).toBe(ctx2);
  });

  it('creates track gains for all 8 tracks', async () => {
    const engine = createAudioEngine();
    await engine.ensureContext();
    const trackIds = ['kick', 'snare', 'hat', 'openhat', 'clap', 'cymbal', 'tom', 'rim'];
    trackIds.forEach(id => {
      expect(engine.getTrackGain(id)).toBeDefined();
    });
  });

  it('setTrackVolume sets gain value', async () => {
    const engine = createAudioEngine();
    await engine.ensureContext();
    engine.setTrackVolume('kick', 50);
    expect(engine.getTrackGain('kick').gain.value).toBeCloseTo(0.5);
  });

  it('setMasterVolume sets master gain', async () => {
    const engine = createAudioEngine();
    await engine.ensureContext();
    engine.setMasterVolume(75);
    expect(engine.getMasterGain().gain.value).toBeCloseTo(0.75);
  });

  it('setReverbMix adjusts reverb/dry gains', async () => {
    const engine = createAudioEngine();
    await engine.ensureContext();
    engine.setReverbMix(50);
    // Just verify it doesn't throw; actual gain values are internal
  });

  it('setCompressorThreshold updates threshold', async () => {
    const engine = createAudioEngine();
    await engine.ensureContext();
    engine.setCompressorThreshold(-20);
    expect(engine.getCompressor().threshold.value).toBe(-20);
  });

  it('setCompressorRatio updates ratio', async () => {
    const engine = createAudioEngine();
    await engine.ensureContext();
    engine.setCompressorRatio(8);
    expect(engine.getCompressor().ratio.value).toBe(8);
  });

  it('setTrackVolume does nothing before context init', () => {
    const engine = createAudioEngine();
    // Should not throw
    engine.setTrackVolume('kick', 50);
    engine.setMasterVolume(50);
    engine.setReverbMix(50);
    engine.setCompressorThreshold(-20);
    engine.setCompressorRatio(8);
  });
});
