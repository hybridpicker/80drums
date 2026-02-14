import { useEffect } from 'react';

export default function useKeyboardShortcuts({
  handleToggle, handleTapTempo, toggleTrainerShortcut,
  handleUndo, handleRedo, toggleDarkMode,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleToggle();
      }
      if (e.key === 't' || e.key === 'T') {
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        handleTapTempo();
      }
      if (e.key === 'g' || e.key === 'G') {
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        if (toggleTrainerShortcut) toggleTrainerShortcut();
      }
      if (e.key === 'd' || e.key === 'D') {
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        if (toggleDarkMode) toggleDarkMode();
      }
      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (handleUndo) handleUndo();
      }
      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && e.shiftKey) {
        e.preventDefault();
        if (handleRedo) handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggle, handleTapTempo, toggleTrainerShortcut, handleUndo, handleRedo, toggleDarkMode]);
}
