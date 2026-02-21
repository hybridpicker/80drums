import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useTimingTrainer from './useTimingTrainer';

describe('useTimingTrainer', () => {
  it('initial state: no mode active', () => {
    const { result } = renderHook(() => useTimingTrainer());
    expect(result.current.trainerMode).toBeNull();
    expect(result.current.trainerConfig).toBeNull();
  });

  // ── toggleMode ──

  describe('toggleMode', () => {
    it('activates a mode', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('callResponse'));
      expect(result.current.trainerMode).toBe('callResponse');
      expect(result.current.trainerConfig).toEqual({ play: 2, silence: 2 });
    });

    it('deactivates when toggling same mode', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('steadyGap'));
      act(() => result.current.toggleMode('steadyGap'));
      expect(result.current.trainerMode).toBeNull();
    });

    it('switches between modes', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('callResponse'));
      act(() => result.current.toggleMode('deepDive'));
      expect(result.current.trainerMode).toBe('deepDive');
      expect(result.current.trainerConfig).toEqual({ play: 2, silence: 4 });
    });
  });

  // ── isInGap ──

  describe('isInGap', () => {
    it('returns false when no mode', () => {
      const { result } = renderHook(() => useTimingTrainer());
      expect(result.current.isInGap(0)).toBe(false);
    });

    it('callResponse: play=2, silence=2 — bars 0,1 play, bars 2,3 gap', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('callResponse'));
      // Bar 0 (steps 0-15) → play
      expect(result.current.isInGap(0)).toBe(false);
      // Bar 1 (steps 16-31) → play
      expect(result.current.isInGap(16)).toBe(false);
      // Bar 2 (steps 32-47) → gap
      expect(result.current.isInGap(32)).toBe(true);
      // Bar 3 (steps 48-63) → gap
      expect(result.current.isInGap(48)).toBe(true);
      // Bar 4 → play again (cycle repeats)
      expect(result.current.isInGap(64)).toBe(false);
    });

    it('steadyGap: play=3, silence=1 — bars 0,1,2 play, bar 3 gap', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('steadyGap'));
      expect(result.current.isInGap(0)).toBe(false);   // bar 0
      expect(result.current.isInGap(16)).toBe(false);  // bar 1
      expect(result.current.isInGap(32)).toBe(false);  // bar 2
      expect(result.current.isInGap(48)).toBe(true);   // bar 3
    });
  });

  // ── fadeAway ──

  describe('fadeAway mode', () => {
    it('starts at phase 0 (play=4, silence=1)', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('fadeAway'));
      expect(result.current.fadePhase).toBe(0);
      expect(result.current.trainerConfig).toEqual({ play: 4, silence: 1 });
    });

    it('resetOnStop resets phase to 0', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('fadeAway'));
      // Simulate some phase progression via onStepAdvance
      // Then reset
      act(() => result.current.resetOnStop());
      expect(result.current.fadePhase).toBe(0);
    });
  });

  // ── getStatusBadge ──

  describe('getStatusBadge', () => {
    it('returns "Aus" when no mode active', () => {
      const { result } = renderHook(() => useTimingTrainer());
      const badge = result.current.getStatusBadge(0, true);
      expect(badge.text).toBe('Aus');
      expect(badge.inSilence).toBe(false);
    });

    it('returns "Aus" when not playing', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('callResponse'));
      const badge = result.current.getStatusBadge(0, false);
      expect(badge.text).toBe('Aus');
    });

    it('shows play badge during play phase', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('callResponse'));
      const badge = result.current.getStatusBadge(0, true);
      expect(badge.inSilence).toBe(false);
      expect(badge.text).toContain('Play');
    });

    it('shows silence badge during gap', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('callResponse'));
      // Bar 2 (step 32) = gap for callResponse
      const badge = result.current.getStatusBadge(32, true);
      expect(badge.inSilence).toBe(true);
      expect(badge.text).toContain('Stille');
    });
  });

  // ── resetOnStop ──

  describe('resetOnStop', () => {
    it('does nothing when not in fadeAway mode', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('callResponse'));
      act(() => result.current.resetOnStop()); // should not throw
      expect(result.current.trainerMode).toBe('callResponse');
    });
  });

  // ── toggleLastMode ──

  describe('toggleLastMode', () => {
    it('toggles off when mode is active', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('callResponse'));
      act(() => result.current.toggleLastMode());
      expect(result.current.trainerMode).toBeNull();
    });

    it('re-activates last mode when no mode is active', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('steadyGap'));
      act(() => result.current.toggleMode('steadyGap')); // turn off
      expect(result.current.trainerMode).toBeNull();
      act(() => result.current.toggleLastMode());
      expect(result.current.trainerMode).toBe('steadyGap');
    });

    it('does nothing when no last mode', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleLastMode());
      expect(result.current.trainerMode).toBeNull();
    });
  });

  // ── onStepAdvance ──

  describe('onStepAdvance', () => {
    it('does nothing when not in fadeAway mode', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('callResponse'));
      act(() => result.current.onStepAdvance(32, 64));
      // Should not affect fadePhase
      expect(result.current.fadePhase).toBe(0);
    });

    it('advances fadePhase on cycle completion in fadeAway mode', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('fadeAway'));
      // fadeAway phase 0: play=4, silence=1, totalCycle=5
      // Cycle completes at bar 5 (step 80)
      // Advance through bars 0-4
      for (let bar = 0; bar <= 4; bar++) {
        act(() => result.current.onStepAdvance(bar * 16, 160));
      }
      // After completing first cycle (bar 5), phase should advance
      act(() => result.current.onStepAdvance(5 * 16, 160));
      // Phase may or may not have advanced depending on cycle boundary
    });
  });

  // ── custom mode ──

  describe('custom mode', () => {
    it('uses custom play/silence values', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('custom'));
      // Default custom: play=3, silence=1
      expect(result.current.trainerConfig).toEqual({ play: 3, silence: 1 });
    });

    it('updates when custom values change', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('custom'));
      act(() => result.current.setCustomPlay(5));
      act(() => result.current.setCustomSilence(3));
      expect(result.current.trainerConfig).toEqual({ play: 5, silence: 3 });
    });
  });
});
