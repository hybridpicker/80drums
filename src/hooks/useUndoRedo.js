import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 50;

export default function useUndoRedo(initialState) {
  const [history, setHistory] = useState([initialState]);
  const [pointer, setPointer] = useState(0);
  const skipNextPush = useRef(false);

  const current = history[pointer];

  const push = useCallback((newState) => {
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }
    setHistory(prev => {
      // Truncate any forward history
      const truncated = prev.slice(0, pointer + 1);
      const next = [...truncated, newState];
      // Cap history size
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    setPointer(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [pointer]);

  const undo = useCallback(() => {
    if (pointer <= 0) return null;
    const newPointer = pointer - 1;
    setPointer(newPointer);
    skipNextPush.current = true;
    return history[newPointer];
  }, [pointer, history]);

  const redo = useCallback(() => {
    if (pointer >= history.length - 1) return null;
    const newPointer = pointer + 1;
    setPointer(newPointer);
    skipNextPush.current = true;
    return history[newPointer];
  }, [pointer, history]);

  const canUndo = pointer > 0;
  const canRedo = pointer < history.length - 1;

  return { current, push, undo, redo, canUndo, canRedo };
}
