import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { STEPS_PER_BAR, TRAINER_PRESETS } from '../utils/patternHelpers';

export default function useTimingTrainer() {
  const [trainerMode, setTrainerMode] = useState(null);
  const [customPlay, setCustomPlay] = useState(3);
  const [customSilence, setCustomSilence] = useState(1);
  const [fadePhase, setFadePhase] = useState(0);
  const [lastMode, setLastMode] = useState(null);

  const trainerConfig = useMemo(() => {
    if (!trainerMode) return null;
    switch (trainerMode) {
      case 'callResponse': return { play: 2, silence: 2 };
      case 'steadyGap': return { play: 3, silence: 1 };
      case 'deepDive': return { play: 2, silence: 4 };
      case 'checkIn': return { play: 1, silence: 3 };
      case 'fadeAway': return { play: Math.max(1, 4 - fadePhase), silence: Math.min(4, 1 + fadePhase) };
      case 'custom': return { play: customPlay, silence: customSilence };
      default: return null;
    }
  }, [trainerMode, fadePhase, customPlay, customSilence]);

  const trainerConfigRef = useRef(trainerConfig);
  useEffect(() => { trainerConfigRef.current = trainerConfig; }, [trainerConfig]);

  const fadePhaseRef = useRef(fadePhase);
  useEffect(() => { fadePhaseRef.current = fadePhase; }, [fadePhase]);

  const trainerModeRef = useRef(trainerMode);
  useEffect(() => { trainerModeRef.current = trainerMode; }, [trainerMode]);

  // Track bar transitions for fadeAway mode
  const lastBarRef = useRef(-1);
  const cycleCountRef = useRef(0);

  const isInGap = useCallback((absoluteStep) => {
    const config = trainerConfigRef.current;
    if (!config) return false;
    const { play, silence } = config;
    const totalCycle = play + silence;
    if (totalCycle <= 0) return false;
    const barIndex = Math.floor(absoluteStep / STEPS_PER_BAR);
    const cyclePos = barIndex % totalCycle;
    return cyclePos >= play;
  }, []);

  // Advance fade phase when a full cycle completes
  const onStepAdvance = useCallback((step, totalSteps) => {
    if (trainerModeRef.current !== 'fadeAway') return;
    const config = trainerConfigRef.current;
    if (!config) return;
    const barIndex = Math.floor(step / STEPS_PER_BAR);
    if (barIndex !== lastBarRef.current) {
      lastBarRef.current = barIndex;
      const totalCycle = config.play + config.silence;
      if (totalCycle > 0 && barIndex > 0 && barIndex % totalCycle === 0) {
        cycleCountRef.current++;
        if (fadePhaseRef.current < 3) {
          setFadePhase(p => Math.min(3, p + 1));
        }
      }
    }
  }, []);

  const toggleMode = useCallback((mode) => {
    setTrainerMode(prev => {
      if (prev === mode) {
        return null; // toggle off
      }
      setLastMode(mode);
      if (mode === 'fadeAway') {
        setFadePhase(0);
        lastBarRef.current = -1;
        cycleCountRef.current = 0;
      }
      return mode;
    });
  }, []);

  const toggleLastMode = useCallback(() => {
    if (trainerMode) {
      setTrainerMode(null);
    } else if (lastMode) {
      toggleMode(lastMode);
    }
  }, [trainerMode, lastMode, toggleMode]);

  const resetOnStop = useCallback(() => {
    if (trainerMode === 'fadeAway') {
      setFadePhase(0);
      lastBarRef.current = -1;
      cycleCountRef.current = 0;
    }
  }, [trainerMode]);

  const getStatusBadge = useCallback((uiStep, isPlaying) => {
    if (!trainerConfig || !isPlaying) return { text: 'Aus', inSilence: false };
    const inGap = isInGap(uiStep);
    const { play, silence } = trainerConfig;
    const totalCycle = play + silence;
    const barIndex = Math.floor(uiStep / STEPS_PER_BAR);
    const cyclePos = barIndex % totalCycle;
    if (inGap) {
      const silenceBar = cyclePos - play + 1;
      return { text: `🎧 Stille ${silenceBar}/${silence}`, inSilence: true };
    }
    return { text: `🔊 Play ${cyclePos + 1}/${play}`, inSilence: false };
  }, [trainerConfig, isInGap]);

  return {
    trainerMode, trainerConfig, customPlay, customSilence, fadePhase,
    setCustomPlay, setCustomSilence,
    toggleMode, toggleLastMode, resetOnStop,
    isInGap, onStepAdvance, getStatusBadge,
    trainerConfigRef,
  };
}
