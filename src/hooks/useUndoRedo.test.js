import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useUndoRedo from './useUndoRedo';

describe('useUndoRedo', () => {
  it('initial state: canUndo=false, canRedo=false', () => {
    const { result } = renderHook(() => useUndoRedo({ a: 1 }));
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.current).toEqual({ a: 1 });
  });

  it('push adds to history', () => {
    const { result } = renderHook(() => useUndoRedo('A'));
    act(() => result.current.push('B'));
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('undo returns previous state', () => {
    const { result } = renderHook(() => useUndoRedo('A'));
    act(() => result.current.push('B'));
    let undone;
    act(() => { undone = result.current.undo(); });
    expect(undone).toBe('A');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('redo returns next state', () => {
    const { result } = renderHook(() => useUndoRedo('A'));
    act(() => result.current.push('B'));
    act(() => { result.current.undo(); });
    let redone;
    act(() => { redone = result.current.redo(); });
    expect(redone).toBe('B');
    expect(result.current.canRedo).toBe(false);
  });

  it('undo at beginning returns null', () => {
    const { result } = renderHook(() => useUndoRedo('A'));
    let undone;
    act(() => { undone = result.current.undo(); });
    expect(undone).toBeNull();
  });

  it('redo at end returns null', () => {
    const { result } = renderHook(() => useUndoRedo('A'));
    let redone;
    act(() => { redone = result.current.redo(); });
    expect(redone).toBeNull();
  });

  it('push after undo truncates forward history', () => {
    const { result } = renderHook(() => useUndoRedo('A'));
    act(() => result.current.push('B'));
    act(() => result.current.push('C'));
    act(() => { result.current.undo(); }); // back to B, skipNextPush=true
    // The next push is skipped due to skipNextPush (undo sets it)
    // Push again to actually add D
    act(() => result.current.push('D_skip'));  // skipped
    act(() => result.current.push('D'));       // this one lands
    // After push, forward history (C) should be gone
    let undone;
    act(() => { undone = result.current.undo(); });
    // Should go back to B (C was truncated)
    expect(undone).toBe('B');
  });

  it('caps at MAX_HISTORY (50)', () => {
    const { result } = renderHook(() => useUndoRedo(0));
    for (let i = 1; i <= 60; i++) {
      act(() => result.current.push(i));
    }
    // Should not have more than 50 undo steps
    let count = 0;
    let undone;
    do {
      act(() => { undone = result.current.undo(); });
      if (undone !== null) count++;
    } while (undone !== null && count < 100);
    expect(count).toBeLessThanOrEqual(50);
  });
});
