import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { STEPS_PER_BAR, MAX_BARS, TRACKS, emptyPattern, resizePattern, presets } from '../utils/patternHelpers';
import { midiToFreq } from '../utils/patternHelpers';
import { createAudioEngine } from '../audio/AudioEngine';
import useScheduler from '../hooks/useScheduler';
import useTimingTrainer from '../hooks/useTimingTrainer';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import useTapTempo from '../hooks/useTapTempo';
import TrackGrid from './TrackGrid';
import GroovePresets from './GroovePresets';
import TempoSwing from './TempoSwing';
import LoopSettings from './LoopSettings';
import TimingTrainer from './TimingTrainer';
import DroneSection from './DroneSection';
import PatternManager from './PatternManager';
import EffectsPanel from './EffectsPanel';
import { autoSave, autoLoad, saveToSlot, loadFromUrlHash, getShareUrl } from '../utils/patternStorage';
import { exportWav } from '../utils/wavExport';
import useUndoRedo from '../hooks/useUndoRedo';

// Create audio engine singleton
const audioEngine = createAudioEngine();

export default function Drumcomputer() {
  // ── Load initial state from URL hash or auto-save ──
  const initialState = useMemo(() => {
    const fromUrl = loadFromUrlHash();
    if (fromUrl) {
      // Clear hash after loading
      window.history.replaceState(null, '', window.location.pathname);
      return fromUrl;
    }
    const fromStorage = autoLoad();
    if (fromStorage) return fromStorage;
    return { patterns: presets["Classic 1"]({ bars: 2 }), bpm: 100, swing: 0, bars: 2 };
  }, []);

  // ── Dark Mode ──
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('drumcomputer_dark') === 'true'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('drumcomputer_dark', darkMode); } catch {}
  }, [darkMode]);

  // ── UI State ──
  const [bpm, setBpm] = useState(initialState.bpm);
  const [bars, setBars] = useState(initialState.bars);
  const [swing, setSwing] = useState(initialState.swing);
  const [isMobileDevice, setIsMobileDevice] = useState(() => window.innerWidth < 1024);
  const [activeMobileBar, setActiveMobileBar] = useState(0);
  const [sectionsCollapsed, setSectionsCollapsed] = useState({
    grooves: true, tempo: true, loop: true, trainer: true, drone: true, patterns: true, effects: true,
  });

  // ── Patterns (8 tracks, 3-level velocity: 0=off, 1=normal, 2=accent) ──
  const [patterns, setPatterns] = useState(() => initialState.patterns);

  // Refs for scheduler access (avoids stale closures)
  const patternsRef = useRef(patterns);
  useEffect(() => { patternsRef.current = patterns; }, [patterns]);

  // ── Mixer State ──
  const [mixer, setMixer] = useState(() => {
    if (initialState.mixer) return initialState.mixer;
    const m = {};
    TRACKS.forEach(t => { m[t.id] = { volume: 100, mute: false, solo: false }; });
    return m;
  });
  const mixerRef = useRef(mixer);
  useEffect(() => { mixerRef.current = mixer; }, [mixer]);

  // Apply mixer volume changes to audio engine
  useEffect(() => {
    TRACKS.forEach(t => {
      audioEngine.setTrackVolume(t.id, mixer[t.id]?.volume ?? 100);
    });
  }, [mixer]);

  // ── Drone ──
  const [droneEnabled, setDroneEnabled] = useState(initialState.droneEnabled || false);
  const [droneNote, setDroneNote] = useState(initialState.droneNote || 33);
  const droneOscRef = useRef(null);
  const droneGainRef = useRef(null);

  const startDrone = useCallback(async () => {
    const ctx = await audioEngine.ensureContext();
    if (droneOscRef.current) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(midiToFreq(droneNote), ctx.currentTime);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, ctx.currentTime);
    filter.Q.setValueAtTime(1, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1.0);
    osc.connect(filter).connect(gain).connect(audioEngine.getMasterGain());
    osc.start();
    droneOscRef.current = osc;
    droneGainRef.current = gain;
  }, [droneNote]);

  const stopDrone = useCallback(() => {
    const ctx = audioEngine.getContext();
    if (!ctx || !droneOscRef.current) return;
    if (droneGainRef.current) {
      droneGainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    }
    if (droneOscRef.current) {
      droneOscRef.current.stop(ctx.currentTime + 0.8);
      droneOscRef.current = null;
      droneGainRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (droneEnabled) startDrone();
    else stopDrone();
    return () => stopDrone();
  }, [droneEnabled, droneNote, startDrone, stopDrone]);

  // ── Effects State ──
  const [reverbMix, setReverbMix] = useState(0);
  const [compThreshold, setCompThreshold] = useState(-12);
  const [compRatio, setCompRatio] = useState(4);
  const [voiceParams, setVoiceParams] = useState(() => {
    const vp = {};
    TRACKS.forEach(t => { vp[t.id] = { tune: 0, decay: 1.0 }; });
    return vp;
  });
  const voiceParamsRef = useRef(voiceParams);
  useEffect(() => { voiceParamsRef.current = voiceParams; }, [voiceParams]);

  // Sync effects to audio engine
  useEffect(() => { audioEngine.setReverbMix(reverbMix); }, [reverbMix]);
  useEffect(() => { audioEngine.setCompressorThreshold(compThreshold); }, [compThreshold]);
  useEffect(() => { audioEngine.setCompressorRatio(compRatio); }, [compRatio]);

  const handleVoiceParamChange = useCallback((trackId, param, value) => {
    setVoiceParams(prev => ({
      ...prev,
      [trackId]: { ...prev[trackId], [param]: value },
    }));
  }, []);

  // ── Undo/Redo ──
  const undoRedo = useUndoRedo(initialState.patterns);

  // Push to undo stack on pattern change (debounced via ref to avoid flood)
  const lastPushedRef = useRef(null);
  useEffect(() => {
    const key = JSON.stringify(patterns);
    if (key !== lastPushedRef.current) {
      lastPushedRef.current = key;
      undoRedo.push(patterns);
    }
  }, [patterns, undoRedo]);

  const handleUndo = useCallback(() => {
    const prev = undoRedo.undo();
    if (prev) { setPatterns(prev); patternsRef.current = prev; }
  }, [undoRedo]);

  const handleRedo = useCallback(() => {
    const next = undoRedo.redo();
    if (next) { setPatterns(next); patternsRef.current = next; }
  }, [undoRedo]);

  // ── Clipboard (copy/paste tracks) ──
  const [clipboard, setClipboard] = useState(null);

  const copyTrack = useCallback((trackId) => {
    setClipboard({ trackId, pattern: [...patterns[trackId]] });
  }, [patterns]);

  const pasteTrack = useCallback((targetTrackId) => {
    if (!clipboard) return;
    setPatterns(prev => {
      const next = { ...prev };
      // Resize clipboard pattern to match target length
      const srcLen = clipboard.pattern.length;
      const tgtLen = prev[targetTrackId].length;
      const pat = Array(tgtLen).fill(0);
      for (let i = 0; i < Math.min(srcLen, tgtLen); i++) pat[i] = clipboard.pattern[i];
      next[targetTrackId] = pat;
      patternsRef.current = next;
      return next;
    });
  }, [clipboard]);

  // ── Metronome ──
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const metronomeRef = useRef(metronomeEnabled);
  useEffect(() => { metronomeRef.current = metronomeEnabled; }, [metronomeEnabled]);

  // ── Timing Trainer ──
  const trainerHook = useTimingTrainer();

  // ── Scheduler ──
  const scheduler = useScheduler(audioEngine, patternsRef, mixerRef, trainerHook, voiceParamsRef, metronomeRef);

  // Sync BPM/Swing/Bars to scheduler refs
  useEffect(() => { scheduler.setBpm(bpm); }, [bpm, scheduler]);
  useEffect(() => { scheduler.setSwing(swing); }, [swing, scheduler]);
  useEffect(() => { scheduler.setBarsRef(bars); }, [bars, scheduler]);

  // ── Resize patterns when bars change ──
  useEffect(() => {
    setPatterns(prev => {
      const next = {};
      TRACKS.forEach(t => {
        next[t.id] = resizePattern(prev[t.id] || emptyPattern(bars), bars);
      });
      return next;
    });
    if (scheduler.currentStepRef.current >= bars * STEPS_PER_BAR) {
      scheduler.currentStepRef.current = 0;
    }
  }, [bars, scheduler]);

  // ── Mobile resize detection ──
  useEffect(() => {
    const handleResize = () => setIsMobileDevice(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Mobile bar follows playhead ──
  useEffect(() => {
    if (scheduler.isPlaying && bars > 1) {
      const currentBar = Math.floor(scheduler.uiStep / STEPS_PER_BAR);
      if (currentBar !== activeMobileBar && currentBar < bars) {
        setActiveMobileBar(currentBar);
      }
    }
  }, [scheduler.uiStep, scheduler.isPlaying, bars, activeMobileBar]);

  // ── Tap Tempo ──
  const transport = useTapTempo(setBpm);

  // ── Keyboard Shortcuts ──
  const toggleDarkMode = useCallback(() => setDarkMode(d => !d), []);
  useKeyboardShortcuts({
    handleToggle: scheduler.handleToggle,
    handleTapTempo: transport.handleTapTempo,
    toggleTrainerShortcut: trainerHook.toggleLastMode,
    handleUndo,
    handleRedo,
    toggleDarkMode,
  });

  // ── Pattern Manipulation ──
  const toggleStep = useCallback((trackId, idx) => {
    setPatterns(prev => {
      const next = { ...prev };
      const pat = [...prev[trackId]];
      // 3-state cycle: 0 → 1 → 2 → 0
      pat[idx] = pat[idx] === 0 ? 1 : pat[idx] === 1 ? 2 : 0;
      next[trackId] = pat;
      // Update ref immediately
      patternsRef.current = next;
      // Schedule if just turned on
      if (pat[idx] >= 1 && prev[trackId][idx] === 0) {
        scheduler.scheduleIfSoon(trackId, idx);
      }
      return next;
    });
  }, [scheduler]);

  const clearAll = useCallback(() => {
    const next = {};
    TRACKS.forEach(t => { next[t.id] = emptyPattern(bars); });
    setPatterns(next);
    patternsRef.current = next;
  }, [bars]);

  const loadPreset = useCallback((name) => {
    const p = presets[name]({ bars });
    setPatterns(p);
    patternsRef.current = p;
  }, [bars]);

  // ── Mixer Controls ──
  const handleVolumeChange = useCallback((trackId, volume) => {
    setMixer(prev => ({ ...prev, [trackId]: { ...prev[trackId], volume } }));
  }, []);

  const handleMuteToggle = useCallback((trackId) => {
    setMixer(prev => ({ ...prev, [trackId]: { ...prev[trackId], mute: !prev[trackId].mute } }));
  }, []);

  const handleSoloToggle = useCallback((trackId) => {
    setMixer(prev => ({ ...prev, [trackId]: { ...prev[trackId], solo: !prev[trackId].solo } }));
  }, []);

  // ── Section Toggle ──
  const toggleSection = useCallback((section) => {
    setSectionsCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // ── Auto-save on state change ──
  useEffect(() => {
    autoSave({ patterns, bpm, swing, bars, mixer, droneEnabled, droneNote });
  }, [patterns, bpm, swing, bars, mixer, droneEnabled, droneNote]);

  // ── Pattern Manager handlers ──
  const handleSaveSlot = useCallback((slotIndex, name) => {
    saveToSlot(slotIndex, { name, patterns, bpm, swing, bars, mixer, droneEnabled, droneNote });
  }, [patterns, bpm, swing, bars, mixer, droneEnabled, droneNote]);

  const handleLoadSlot = useCallback((data) => {
    if (data.patterns) { setPatterns(data.patterns); patternsRef.current = data.patterns; }
    if (data.bpm) setBpm(data.bpm);
    if (data.swing !== undefined) setSwing(data.swing);
    if (data.bars) setBars(data.bars);
    if (data.mixer) setMixer(data.mixer);
    if (data.droneEnabled !== undefined) setDroneEnabled(data.droneEnabled);
    if (data.droneNote) setDroneNote(data.droneNote);
  }, []);

  const handleShare = useCallback(() => {
    return getShareUrl({ patterns, bpm, swing, bars });
  }, [patterns, bpm, swing, bars]);

  const handleExportWav = useCallback(() => {
    return exportWav({ patterns, bpm, swing, bars, mixer });
  }, [patterns, bpm, swing, bars, mixer]);

  // ── Click-drag step entry ──
  const [isDragging, setIsDragging] = useState(false);
  const dragTrackRef = useRef(null);
  const dragValueRef = useRef(0);

  const handleDragStart = useCallback((trackId, stepIndex, currentValue) => {
    setIsDragging(true);
    dragTrackRef.current = trackId;
    // Drag paints the opposite: if step was off, paint on; if on, paint off
    dragValueRef.current = currentValue > 0 ? 0 : 1;
  }, []);

  const handleDragEnter = useCallback((trackId, stepIndex) => {
    if (!isDragging || trackId !== dragTrackRef.current) return;
    setPatterns(prev => {
      const next = { ...prev };
      const pat = [...prev[trackId]];
      pat[stepIndex] = dragValueRef.current;
      next[trackId] = pat;
      patternsRef.current = next;
      return next;
    });
  }, [isDragging]);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
      dragTrackRef.current = null;
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // ── Derived ──
  const totalSteps = useMemo(() => bars * STEPS_PER_BAR, [bars]);
  const trainerStatus = trainerHook.getStatusBadge(scheduler.uiStep, scheduler.isPlaying);
  const isCurrentlyInSilence = useMemo(() => {
    if (!trainerHook.trainerConfig || !scheduler.isPlaying) return false;
    return trainerHook.isInGap(scheduler.uiStep);
  }, [trainerHook, scheduler.isPlaying, scheduler.uiStep]);

  // ── Background gradient changes during silence ──
  const bgGradient = darkMode
    ? (isCurrentlyInSilence ? 'from-amber-950/40 via-orange-950/30 to-yellow-950/40' : 'from-neutral-950 via-neutral-900 to-neutral-950')
    : (isCurrentlyInSilence ? 'from-amber-50/40 via-orange-50/30 to-yellow-50/40' : 'from-zinc-50 via-neutral-50 to-stone-50');

  // Dark mode CSS classes
  const dm = darkMode;
  const cardClass = dm
    ? 'bg-neutral-800/70 backdrop-blur-sm border border-neutral-700/60 rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-200'
    : 'bg-white/70 backdrop-blur-sm border border-neutral-200/60 rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-200';
  const textPrimary = dm ? 'text-neutral-100' : 'text-neutral-900';
  const textSecondary = dm ? 'text-neutral-400' : 'text-neutral-500';
  const sectionLabel = dm ? 'text-neutral-300' : 'text-neutral-700';

  return (
    <div className={`min-h-screen w-full bg-gradient-to-br ${bgGradient} ${textPrimary} p-3 sm:p-4 md:p-6 transition-colors duration-500`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center ${
              dm ? 'bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-300' : 'bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-700'
            }`}>
              <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${dm ? 'bg-neutral-900/90' : 'bg-white/90'}`}></div>
            </div>
            <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${
              dm ? 'from-neutral-100 via-neutral-200 to-neutral-400' : 'from-neutral-900 via-neutral-800 to-neutral-600'
            }`}>
              Drumcomputer
            </h1>
            <span className={`px-2 py-1 text-xs rounded-full font-medium border hidden sm:inline ${
              dm ? 'bg-neutral-800/80 text-neutral-400 border-neutral-700/50' : 'bg-neutral-100/80 text-neutral-600 border-neutral-200/50'
            }`}>80s/90s</span>
            {/* Dark mode + Metronome toggles */}
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setMetronomeEnabled(m => !m)}
                className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                  metronomeEnabled
                    ? (dm ? 'bg-amber-600 text-white' : 'bg-amber-500 text-white')
                    : (dm ? 'bg-neutral-700/60 text-neutral-400 hover:bg-neutral-600/60' : 'bg-neutral-100/60 text-neutral-500 hover:bg-neutral-200/60')
                }`}
                title="Metronome (click track)"
              >Met</button>
              <button
                onClick={toggleDarkMode}
                className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                  dm ? 'bg-neutral-700/60 text-yellow-400 hover:bg-neutral-600/60' : 'bg-neutral-100/60 text-neutral-600 hover:bg-neutral-200/60'
                }`}
                title="Toggle dark mode (D)"
              >{dm ? '☀' : '🌙'}</button>
              {undoRedo.canUndo && (
                <button onClick={handleUndo} className={`px-1.5 py-1 rounded text-[10px] font-mono ${dm ? 'bg-neutral-700/60 text-neutral-400' : 'bg-neutral-100/60 text-neutral-500'}`} title="Undo (Cmd+Z)">↩</button>
              )}
              {undoRedo.canRedo && (
                <button onClick={handleRedo} className={`px-1.5 py-1 rounded text-[10px] font-mono ${dm ? 'bg-neutral-700/60 text-neutral-400' : 'bg-neutral-100/60 text-neutral-500'}`} title="Redo (Cmd+Shift+Z)">↪</button>
              )}
            </div>
          </div>
          <p className={`text-xs sm:text-sm ${textSecondary}`}>
            <span className="hidden sm:inline">8 Tracks • Live editing • Swing • Timing Trainer • </span>{totalSteps} steps
          </p>
        </header>

        {/* Control Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">

          {/* Grooves + Transport */}
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <button
                onClick={() => toggleSection('grooves')}
                className={`flex items-center gap-2 text-xs sm:text-sm font-semibold ${sectionLabel} hover:opacity-80 transition-colors lg:cursor-default`}
              >
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full"></div>
                <span>Grooves</span>
                <span className="text-neutral-400 lg:hidden">{sectionsCollapsed.grooves ? '▼' : '▲'}</span>
              </button>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={transport.handleTapTempo}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-2xl text-xs sm:text-sm font-medium transition-all duration-200 active:scale-95 ${
                    transport.tapActive
                      ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-neutral-900 shadow-lg shadow-yellow-400/25"
                      : "bg-neutral-100/80 hover:bg-neutral-200/80 text-neutral-700 backdrop-blur-sm"
                  }`}
                  title={`Tap tempo (T)${transport.tapTimes.length > 0 ? ` - ${transport.tapTimes.length} taps` : ''}`}
                >
                  <span className="sm:hidden">T</span>
                  <span className="hidden sm:inline">Tap {transport.tapTimes.length > 0 && `(${transport.tapTimes.length})`}</span>
                </button>
                <button
                  onClick={scheduler.handleToggle}
                  className={`px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-2xl text-sm sm:text-base font-semibold transition-all duration-200 active:scale-95 ${
                    scheduler.isPlaying
                      ? "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25"
                      : "bg-gradient-to-r from-neutral-900 to-neutral-800 text-white hover:from-neutral-800 hover:to-neutral-700 shadow-lg shadow-neutral-900/25"
                  }`}
                  title="Start/Stop (Space)"
                >
                  {scheduler.isPlaying ? "Stop" : "Start"}
                </button>
              </div>
            </div>
            <GroovePresets
              onLoadPreset={loadPreset} onClear={clearAll}
              collapsed={sectionsCollapsed.grooves}
            />
          </div>

          {/* Tempo & Swing */}
          <div className={cardClass}>
            <button
              onClick={() => toggleSection('tempo')}
              className={`flex items-center justify-between w-full mb-3 sm:mb-4 text-xs sm:text-sm font-semibold ${sectionLabel} hover:opacity-80 transition-colors lg:cursor-default`}
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full"></div>
                <span className="hidden sm:inline lg:inline">Tempo & Swing</span>
                <span className="sm:hidden lg:hidden">Tempo</span>
              </div>
              <span className="text-neutral-400 lg:hidden">{sectionsCollapsed.tempo ? '▼' : '▲'}</span>
            </button>
            <TempoSwing bpm={bpm} swing={swing} onBpmChange={setBpm} onSwingChange={setSwing} collapsed={sectionsCollapsed.tempo} />
          </div>

          {/* Loop */}
          <div className={cardClass}>
            <button
              onClick={() => toggleSection('loop')}
              className={`flex items-center justify-between w-full mb-3 sm:mb-4 text-xs sm:text-sm font-semibold ${sectionLabel} hover:opacity-80 transition-colors lg:cursor-default`}
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full"></div>
                <span>Loop</span>
              </div>
              <span className="text-neutral-400 lg:hidden">{sectionsCollapsed.loop ? '▼' : '▲'}</span>
            </button>
            <LoopSettings bars={bars} onBarsChange={setBars} collapsed={sectionsCollapsed.loop} />
          </div>

          {/* Timing Trainer */}
          <div className={`${dm ? 'bg-neutral-800/70' : 'bg-white/70'} backdrop-blur-sm border rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-200 ${
            isCurrentlyInSilence ? 'border-amber-300/50 ring-2 ring-amber-300/50' : (dm ? 'border-neutral-700/60' : 'border-neutral-200/60')
          }`}>
            <button
              onClick={() => toggleSection('trainer')}
              className={`flex items-center justify-between w-full mb-3 sm:mb-4 text-xs sm:text-sm font-semibold ${sectionLabel} hover:opacity-80 transition-colors lg:cursor-default`}
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-500 rounded-full"></div>
                <span className="hidden sm:inline lg:inline">Timing Trainer</span>
                <span className="sm:hidden lg:hidden">Trainer</span>
              </div>
              <div className="flex items-center gap-2">
                {trainerHook.trainerMode && (
                  <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    isCurrentlyInSilence
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {trainerStatus.text}
                  </span>
                )}
                <span className="text-neutral-400 lg:hidden">{sectionsCollapsed.trainer ? '▼' : '▲'}</span>
              </div>
            </button>
            <TimingTrainer
              trainerMode={trainerHook.trainerMode}
              customPlay={trainerHook.customPlay}
              customSilence={trainerHook.customSilence}
              fadePhase={trainerHook.fadePhase}
              onToggleMode={trainerHook.toggleMode}
              onCustomPlayChange={trainerHook.setCustomPlay}
              onCustomSilenceChange={trainerHook.setCustomSilence}
              statusBadge={trainerStatus}
              collapsed={sectionsCollapsed.trainer}
            />
          </div>

          {/* Drone */}
          <div className={cardClass}>
            <button
              onClick={() => toggleSection('drone')}
              className={`flex items-center justify-between w-full mb-3 sm:mb-4 text-xs sm:text-sm font-semibold ${sectionLabel} hover:opacity-80 transition-colors lg:cursor-default`}
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-500 rounded-full"></div>
                <span>Drone</span>
              </div>
              <span className="text-neutral-400 lg:hidden">{sectionsCollapsed.drone ? '▼' : '▲'}</span>
            </button>
            <DroneSection
              droneEnabled={droneEnabled} droneNote={droneNote}
              onToggle={setDroneEnabled} onNoteChange={setDroneNote}
              collapsed={sectionsCollapsed.drone}
            />
          </div>

          {/* Patterns (Save/Load/Share/Export) */}
          <div className={cardClass}>
            <button
              onClick={() => toggleSection('patterns')}
              className={`flex items-center justify-between w-full mb-3 sm:mb-4 text-xs sm:text-sm font-semibold ${sectionLabel} hover:opacity-80 transition-colors lg:cursor-default`}
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-500 rounded-full"></div>
                <span>Patterns</span>
              </div>
              <span className="text-neutral-400 lg:hidden">{sectionsCollapsed.patterns ? '▼' : '▲'}</span>
            </button>
            <PatternManager
              onSave={handleSaveSlot}
              onLoad={handleLoadSlot}
              onShare={handleShare}
              onExport={handleExportWav}
              collapsed={sectionsCollapsed.patterns}
            />
          </div>
        </div>

        {/* Effects Panel */}
        <div className={`${cardClass} mb-4 sm:mb-6 md:mb-8`}>
          <button
            onClick={() => toggleSection('effects')}
            className={`flex items-center justify-between w-full mb-3 sm:mb-4 text-xs sm:text-sm font-semibold ${sectionLabel} hover:opacity-80 transition-colors lg:cursor-default`}
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-fuchsia-500 rounded-full"></div>
              <span>Effects & Sound Design</span>
            </div>
            <span className="text-neutral-400 lg:hidden">{sectionsCollapsed.effects ? '▼' : '▲'}</span>
          </button>
          <EffectsPanel
            reverbMix={reverbMix}
            onReverbChange={setReverbMix}
            compThreshold={compThreshold}
            compRatio={compRatio}
            onCompThresholdChange={setCompThreshold}
            onCompRatioChange={setCompRatio}
            voiceParams={voiceParams}
            onVoiceParamChange={handleVoiceParamChange}
            collapsed={sectionsCollapsed.effects}
          />
        </div>

        {/* Sequencer */}
        <div className={`${dm ? 'bg-neutral-800/70' : 'bg-white/70'} backdrop-blur-sm border rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-6 shadow-sm hover:shadow-md transition-all duration-200 ${
          isCurrentlyInSilence ? 'ring-2 ring-amber-300/50 border-amber-200/60' : (dm ? 'border-neutral-700/60' : 'border-neutral-200/60')
        }`}>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"></div>
              <h2 className="text-xs sm:text-sm font-semibold text-neutral-700">
                <span className="hidden sm:inline">Pattern Sequencer</span>
                <span className="sm:hidden">Sequencer</span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {isCurrentlyInSilence ? (
                <span className="text-[10px] sm:text-xs text-amber-600 bg-amber-100/60 px-2 py-1 rounded-full font-medium">
                  🎧 Dein Turn
                </span>
              ) : trainerHook.trainerMode && scheduler.isPlaying ? (
                <span className="text-[10px] sm:text-xs text-neutral-500 bg-neutral-100/40 px-2 py-1 rounded-full">
                  🔊 Listen
                </span>
              ) : null}
              <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-neutral-500 bg-neutral-100/40 px-2 sm:px-3 py-1 sm:py-2 rounded-full backdrop-blur-sm">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                <span className="hidden sm:inline">Playhead</span>
                <span className="sm:hidden">▶</span>
              </div>
            </div>
          </div>

          {TRACKS.map(track => (
            <TrackGrid
              key={track.id}
              trackId={track.id}
              name={track.name}
              pattern={patterns[track.id] || emptyPattern(bars)}
              colorClass={track.colorClass}
              playhead={scheduler.uiStep}
              isPlaying={scheduler.isPlaying}
              isMobileDevice={isMobileDevice}
              bars={bars}
              activeMobileBar={activeMobileBar}
              setActiveMobileBar={setActiveMobileBar}
              onToggleStep={toggleStep}
              volume={mixer[track.id]?.volume ?? 100}
              mute={mixer[track.id]?.mute ?? false}
              solo={mixer[track.id]?.solo ?? false}
              onVolumeChange={handleVolumeChange}
              onMuteToggle={handleMuteToggle}
              onSoloToggle={handleSoloToggle}
              isDragging={isDragging}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              onCopy={copyTrack}
              onPaste={pasteTrack}
              hasClipboard={!!clipboard}
              darkMode={darkMode}
            />
          ))}

          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-neutral-200/60">
            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-neutral-500 bg-gradient-to-r from-neutral-50/80 to-neutral-100/80 p-2 sm:p-3 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-neutral-200/40">
              <span className="text-sm sm:text-lg">💡</span>
              <div>
                <strong>Tip:</strong>
                <span className="hidden sm:inline"> Click = On, Click again = Accent, Click again = Off • Enable Timing Trainer (G) for gap practice</span>
                <span className="sm:hidden"> Tap: Off → On → Accent → Off • Use presets</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className={`mt-4 sm:mt-6 md:mt-8 text-center text-[10px] sm:text-[11px] ${textSecondary}`}>
          <div className={`${dm ? 'bg-neutral-800/40 border-neutral-700/40' : 'bg-neutral-100/40 border-neutral-200/40'} backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 border`}>
            <p className="mb-1 sm:mb-2">Drumcomputer by <strong>Lukas Schönsgibl</strong> • <a href="https://schoensgibl.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">schoensgibl.com</a></p>
            <p className="mb-2">Vibe Coded with Claude</p>
            <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
              {[['Space', 'Start/Stop'], ['T', 'Tap Tempo'], ['G', 'Trainer'], ['D', 'Dark Mode'], ['Cmd+Z', 'Undo']].map(([key, label]) => (
                <div key={key} className="flex items-center gap-1 sm:gap-2">
                  <kbd className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-mono border shadow-sm ${
                    dm ? 'bg-neutral-700/70 text-neutral-300 border-neutral-600/60' : 'bg-white/70 text-neutral-700 border-neutral-200/60'
                  }`}>{key}</kbd>
                  <span className="text-[9px] sm:text-[10px]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
