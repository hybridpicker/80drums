import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useScheduler from './useScheduler';

function makeMockAudioEngine() {
  const mockGain = { gain: { value: 1 } };
  const mockCtx = {
    state: 'running',
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    createGain: () => ({
      gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn().mockReturnThis(),
    }),
    createOscillator: () => ({
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn().mockReturnThis(),
      start: vi.fn(),
      stop: vi.fn(),
    }),
    resume: vi.fn(),
  };
  return {
    ensureContext: vi.fn().mockResolvedValue(mockCtx),
    getContext: vi.fn().mockReturnValue(mockCtx),
    getMasterGain: vi.fn().mockReturnValue(mockGain),
    getTrackGain: vi.fn().mockReturnValue(mockGain),
    setTrackVolume: vi.fn(),
    setMasterVolume: vi.fn(),
    setReverbMix: vi.fn(),
    setCompressorThreshold: vi.fn(),
    setCompressorRatio: vi.fn(),
    getCompressor: vi.fn(),
  };
}

function makeMockTrainerHook() {
  return {
    isInGap: vi.fn().mockReturnValue(false),
    onStepAdvance: vi.fn(),
    resetOnStop: vi.fn(),
    trainerConfigRef: { current: null },
  };
}

describe('useScheduler', () => {
  it('initial state: not playing, uiStep 0', () => {
    const engine = makeMockAudioEngine();
    const patternsRef = { current: {} };
    const mixerRef = { current: {} };
    const trainerHook = makeMockTrainerHook();
    const voiceParamsRef = { current: {} };
    const metronomeRef = { current: false };

    const { result } = renderHook(() =>
      useScheduler(engine, patternsRef, mixerRef, trainerHook, voiceParamsRef, metronomeRef)
    );

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.uiStep).toBe(0);
  });

  it('setBpm, setSwing, setBarsRef update refs', () => {
    const engine = makeMockAudioEngine();
    const patternsRef = { current: {} };
    const mixerRef = { current: {} };
    const trainerHook = makeMockTrainerHook();
    const voiceParamsRef = { current: {} };
    const metronomeRef = { current: false };

    const { result } = renderHook(() =>
      useScheduler(engine, patternsRef, mixerRef, trainerHook, voiceParamsRef, metronomeRef)
    );

    act(() => result.current.setBpm(140));
    expect(result.current.bpmRef.current).toBe(140);

    act(() => result.current.setSwing(30));
    expect(result.current.swingRef.current).toBe(30);

    act(() => result.current.setBarsRef(4));
    expect(result.current.barsRef.current).toBe(4);
  });

  it('handleToggle starts and stops', async () => {
    const engine = makeMockAudioEngine();
    const patternsRef = { current: { kick: Array(32).fill(0) } };
    const mixerRef = { current: { kick: { volume: 100, mute: false, solo: false } } };
    const trainerHook = makeMockTrainerHook();
    const voiceParamsRef = { current: {} };
    const metronomeRef = { current: false };

    const { result } = renderHook(() =>
      useScheduler(engine, patternsRef, mixerRef, trainerHook, voiceParamsRef, metronomeRef)
    );

    // Start
    await act(async () => { await result.current.handleToggle(); });
    expect(result.current.isPlaying).toBe(true);
    expect(engine.ensureContext).toHaveBeenCalled();

    // Stop
    act(() => result.current.handleToggle());
    expect(result.current.isPlaying).toBe(false);
    expect(trainerHook.resetOnStop).toHaveBeenCalled();
  });

  it('handleStop resets step to 0', async () => {
    const engine = makeMockAudioEngine();
    const patternsRef = { current: {} };
    const mixerRef = { current: {} };
    const trainerHook = makeMockTrainerHook();
    const voiceParamsRef = { current: {} };
    const metronomeRef = { current: false };

    const { result } = renderHook(() =>
      useScheduler(engine, patternsRef, mixerRef, trainerHook, voiceParamsRef, metronomeRef)
    );

    await act(async () => { await result.current.handleStart(); });
    act(() => result.current.handleStop());
    expect(result.current.uiStep).toBe(0);
    expect(result.current.currentStepRef.current).toBe(0);
  });

  it('scheduleIfSoon does nothing when not playing', () => {
    const engine = makeMockAudioEngine();
    const patternsRef = { current: {} };
    const mixerRef = { current: {} };
    const trainerHook = makeMockTrainerHook();
    const voiceParamsRef = { current: {} };
    const metronomeRef = { current: false };

    const { result } = renderHook(() =>
      useScheduler(engine, patternsRef, mixerRef, trainerHook, voiceParamsRef, metronomeRef)
    );

    // Should not throw or call anything
    act(() => result.current.scheduleIfSoon('kick', 0));
  });

  it('handleStart then handleStop cleans up properly', async () => {
    const engine = makeMockAudioEngine();
    const patternsRef = { current: { kick: Array(32).fill(0) } };
    const mixerRef = { current: { kick: { volume: 100, mute: false, solo: false } } };
    const trainerHook = makeMockTrainerHook();
    const voiceParamsRef = { current: {} };
    const metronomeRef = { current: false };

    const { result } = renderHook(() =>
      useScheduler(engine, patternsRef, mixerRef, trainerHook, voiceParamsRef, metronomeRef)
    );

    await act(async () => { await result.current.handleStart(); });
    expect(result.current.isPlaying).toBe(true);

    act(() => result.current.handleStop());
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.uiStep).toBe(0);
  });

  it('handleStart schedules audio using setInterval', async () => {
    const engine = makeMockAudioEngine();
    const patternsRef = { current: { kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] } };
    const mixerRef = { current: { kick: { volume: 100, mute: false, solo: false } } };
    const trainerHook = makeMockTrainerHook();
    const voiceParamsRef = { current: { kick: { tune: 0, decay: 1.0 } } };
    const metronomeRef = { current: true };

    const { result } = renderHook(() =>
      useScheduler(engine, patternsRef, mixerRef, trainerHook, voiceParamsRef, metronomeRef)
    );

    await act(async () => { await result.current.handleStart(); });

    // Scheduler should call trainerHook.onStepAdvance
    // The scheduling loop runs via setInterval, checking context time
    expect(result.current.isPlaying).toBe(true);

    // Clean up
    act(() => result.current.handleStop());
  });

  it('scheduleIfSoon with no context returns early', async () => {
    const engine = makeMockAudioEngine();
    engine.getContext.mockReturnValue(null);
    const patternsRef = { current: {} };
    const mixerRef = { current: {} };
    const trainerHook = makeMockTrainerHook();
    const voiceParamsRef = { current: {} };
    const metronomeRef = { current: false };

    const { result } = renderHook(() =>
      useScheduler(engine, patternsRef, mixerRef, trainerHook, voiceParamsRef, metronomeRef)
    );

    // Should not throw
    act(() => result.current.scheduleIfSoon('kick', 0));
  });

  it('unmount cleans up intervals', async () => {
    const engine = makeMockAudioEngine();
    const patternsRef = { current: { kick: Array(32).fill(0) } };
    const mixerRef = { current: { kick: { volume: 100, mute: false, solo: false } } };
    const trainerHook = makeMockTrainerHook();
    const voiceParamsRef = { current: {} };
    const metronomeRef = { current: false };

    const { result, unmount } = renderHook(() =>
      useScheduler(engine, patternsRef, mixerRef, trainerHook, voiceParamsRef, metronomeRef)
    );

    await act(async () => { await result.current.handleStart(); });

    // Unmount should clean up without errors
    unmount();
  });
});
