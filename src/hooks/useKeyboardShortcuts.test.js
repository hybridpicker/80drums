import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import useKeyboardShortcuts from './useKeyboardShortcuts';

function fireKey(key, opts = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    code: key === ' ' ? 'Space' : `Key${key.toUpperCase()}`,
    bubbles: true,
    ...opts,
  });
  window.dispatchEvent(event);
}

describe('useKeyboardShortcuts', () => {
  it('Space triggers handleToggle', () => {
    const handleToggle = vi.fn();
    renderHook(() => useKeyboardShortcuts({
      handleToggle,
      handleTapTempo: vi.fn(),
      toggleTrainerShortcut: vi.fn(),
      handleUndo: vi.fn(),
      handleRedo: vi.fn(),
      toggleDarkMode: vi.fn(),
    }));

    fireKey(' ', { code: 'Space' });
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('T triggers handleTapTempo', () => {
    const handleTapTempo = vi.fn();
    renderHook(() => useKeyboardShortcuts({
      handleToggle: vi.fn(),
      handleTapTempo,
      toggleTrainerShortcut: vi.fn(),
      handleUndo: vi.fn(),
      handleRedo: vi.fn(),
      toggleDarkMode: vi.fn(),
    }));

    fireKey('t');
    expect(handleTapTempo).toHaveBeenCalledTimes(1);
  });

  it('G triggers toggleTrainerShortcut', () => {
    const toggleTrainerShortcut = vi.fn();
    renderHook(() => useKeyboardShortcuts({
      handleToggle: vi.fn(),
      handleTapTempo: vi.fn(),
      toggleTrainerShortcut,
      handleUndo: vi.fn(),
      handleRedo: vi.fn(),
      toggleDarkMode: vi.fn(),
    }));

    fireKey('g');
    expect(toggleTrainerShortcut).toHaveBeenCalledTimes(1);
  });

  it('D triggers toggleDarkMode', () => {
    const toggleDarkMode = vi.fn();
    renderHook(() => useKeyboardShortcuts({
      handleToggle: vi.fn(),
      handleTapTempo: vi.fn(),
      toggleTrainerShortcut: vi.fn(),
      handleUndo: vi.fn(),
      handleRedo: vi.fn(),
      toggleDarkMode,
    }));

    fireKey('d');
    expect(toggleDarkMode).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+Z triggers handleUndo', () => {
    const handleUndo = vi.fn();
    renderHook(() => useKeyboardShortcuts({
      handleToggle: vi.fn(),
      handleTapTempo: vi.fn(),
      toggleTrainerShortcut: vi.fn(),
      handleUndo,
      handleRedo: vi.fn(),
      toggleDarkMode: vi.fn(),
    }));

    fireKey('z', { ctrlKey: true });
    expect(handleUndo).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+Shift+Z triggers handleRedo', () => {
    const handleRedo = vi.fn();
    renderHook(() => useKeyboardShortcuts({
      handleToggle: vi.fn(),
      handleTapTempo: vi.fn(),
      toggleTrainerShortcut: vi.fn(),
      handleUndo: vi.fn(),
      handleRedo,
      toggleDarkMode: vi.fn(),
    }));

    fireKey('Z', { ctrlKey: true, shiftKey: true });
    expect(handleRedo).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+T does NOT trigger tap tempo', () => {
    const handleTapTempo = vi.fn();
    renderHook(() => useKeyboardShortcuts({
      handleToggle: vi.fn(),
      handleTapTempo,
      toggleTrainerShortcut: vi.fn(),
      handleUndo: vi.fn(),
      handleRedo: vi.fn(),
      toggleDarkMode: vi.fn(),
    }));

    fireKey('t', { ctrlKey: true });
    expect(handleTapTempo).not.toHaveBeenCalled();
  });

  it('cleans up event listener on unmount', () => {
    const handleToggle = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({
      handleToggle,
      handleTapTempo: vi.fn(),
      toggleTrainerShortcut: vi.fn(),
      handleUndo: vi.fn(),
      handleRedo: vi.fn(),
      toggleDarkMode: vi.fn(),
    }));

    unmount();
    fireKey(' ', { code: 'Space' });
    expect(handleToggle).not.toHaveBeenCalled();
  });
});
