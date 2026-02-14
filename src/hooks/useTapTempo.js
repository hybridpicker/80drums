import { useState, useRef, useCallback } from 'react';

export default function useTapTempo(onBpmChange) {
  const [tapTimes, setTapTimes] = useState([]);
  const [tapActive, setTapActive] = useState(false);
  const tapTimeoutRef = useRef(null);
  const tapActiveTimeoutRef = useRef(null);

  const handleTapTempo = useCallback(() => {
    const now = Date.now();
    setTapActive(true);
    if (tapActiveTimeoutRef.current) clearTimeout(tapActiveTimeoutRef.current);
    tapActiveTimeoutRef.current = setTimeout(() => setTapActive(false), 100);
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);

    setTapTimes(prev => {
      const newTaps = [...prev, now].slice(-8);
      if (newTaps.length >= 2) {
        const intervals = [];
        for (let i = 1; i < newTaps.length; i++) intervals.push(newTaps[i] - newTaps[i - 1]);
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const calculatedBpm = Math.round(60000 / avgInterval);
        if (calculatedBpm >= 50 && calculatedBpm <= 220) onBpmChange(calculatedBpm);
      }
      return newTaps;
    });

    tapTimeoutRef.current = setTimeout(() => setTapTimes([]), 2000);
  }, [onBpmChange]);

  return { tapActive, tapTimes, handleTapTempo };
}
