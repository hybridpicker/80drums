import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useTapTempo from './useTapTempo';

describe('useTapTempo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initial state has no taps and inactive', () => {
    const onBpm = vi.fn();
    const { result } = renderHook(() => useTapTempo(onBpm));
    expect(result.current.tapTimes).toEqual([]);
    expect(result.current.tapActive).toBe(false);
  });

  it('single tap does not calculate BPM', () => {
    const onBpm = vi.fn();
    const { result } = renderHook(() => useTapTempo(onBpm));
    act(() => result.current.handleTapTempo());
    expect(onBpm).not.toHaveBeenCalled();
  });

  it('two taps at 500ms = 120 BPM', () => {
    const onBpm = vi.fn();
    const { result } = renderHook(() => useTapTempo(onBpm));

    vi.setSystemTime(new Date(1000));
    act(() => result.current.handleTapTempo());

    vi.setSystemTime(new Date(1500));
    act(() => result.current.handleTapTempo());

    expect(onBpm).toHaveBeenCalledWith(120);
  });

  it('clamps BPM to 50-220 range (ignores out-of-range)', () => {
    const onBpm = vi.fn();
    const { result } = renderHook(() => useTapTempo(onBpm));

    // Very fast tapping (20ms apart = 3000 BPM → out of range)
    vi.setSystemTime(new Date(1000));
    act(() => result.current.handleTapTempo());
    vi.setSystemTime(new Date(1020));
    act(() => result.current.handleTapTempo());

    expect(onBpm).not.toHaveBeenCalled();
  });

  it('resets taps after 2s pause', () => {
    const onBpm = vi.fn();
    const { result } = renderHook(() => useTapTempo(onBpm));

    vi.setSystemTime(new Date(1000));
    act(() => result.current.handleTapTempo());
    vi.setSystemTime(new Date(1500));
    act(() => result.current.handleTapTempo());

    expect(onBpm).toHaveBeenCalledTimes(1);
    onBpm.mockClear();

    // Wait 2 seconds → taps should reset
    act(() => vi.advanceTimersByTime(2100));

    // New single tap after reset should not produce BPM
    vi.setSystemTime(new Date(5000));
    act(() => result.current.handleTapTempo());
    expect(onBpm).not.toHaveBeenCalled();
  });

  it('tapActive becomes true on tap', () => {
    const onBpm = vi.fn();
    const { result } = renderHook(() => useTapTempo(onBpm));

    act(() => result.current.handleTapTempo());
    expect(result.current.tapActive).toBe(true);

    act(() => vi.advanceTimersByTime(200));
    expect(result.current.tapActive).toBe(false);
  });
});
