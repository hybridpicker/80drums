import React, { useEffect, useMemo, useRef, useState } from "react";

// Minimalist 80s/90s-inspired Drumcomputer
// Single-file React component using the Web Audio API.
// TailwindCSS classes are used for styling (no external assets).
// — Features —
// • Multi-bar looping (1–4 bars, 16 steps per bar)
// • Tempo control (50–220 BPM)
// • Swing (0–60%, pushes even 16ths later)
// • Practice Gaps (macro-timing training): silence every N bars for M bars
// • Step sequencer for Kick / Snare / Hi-Hat
// • Start/Stop, Clear, and classic presets
// • Live-safe editing: changing steps while playing updates sound immediately
// • Visual playhead: the current step is clearly highlighted

const STEPS_PER_BAR = 16; // classic 16th grid per bar
const MAX_BARS = 4;

// Utility to create a 0/1 step array
const emptyPattern = (bars) => Array(bars * STEPS_PER_BAR).fill(0);

// MIDI note to frequency conversion
const midiToFreq = (midiNote) => 440 * Math.pow(2, (midiNote - 69) / 12);

// Note names for drone
const getNoteNameFromMidi = (midiNote) => {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}${octave}`;
};

// Some classic starter presets (0/1 per step)
const presets = {
  "Classic 1": ({ bars }) => ({
    kick: seed([0, 8], bars),
    snare: seed([4, 12], bars),
    hat: every(2, bars), // straight 8ths
    cymbal: seed([0], bars), // Crash on bar 1
  }),
  "Classic 2": ({ bars }) => ({
    kick: seed([0, 7, 8, 10, 15], bars),
    snare: seed([4, 12], bars),
    hat: every(1, bars), // 16ths
    cymbal: seed([0, 8], bars), // Crash on beat 1 of each bar
  }),
  "New Jack": ({ bars }) => ({
    kick: seed([0, 6, 8, 11], bars),
    snare: seed([4, 12], bars),
    hat: mix(every(1, bars), seed([3, 7, 11, 15], bars)),
    cymbal: seed([0, 14], bars), // Crash + pickup
  }),
  "Breakbeat": ({ bars }) => ({
    kick: seed([0, 10, 13], bars),
    snare: seed([4, 12], bars),
    hat: seed([2, 6, 9, 14], bars), // Syncopated hats
    cymbal: seed([0, 15], bars), // Start + end crash
  }),
  "Four Floor": ({ bars }) => ({
    kick: every(4, bars), // Classic 4/4 kick
    snare: seed([4, 12], bars),
    hat: every(1, bars), // 16th hats
    cymbal: seed([0], bars), // Single crash
  }),
  "Jungle": ({ bars }) => ({
    kick: seed([0, 3, 8, 11, 14], bars),
    snare: seed([4, 10, 12, 15], bars), // Chopped breaks
    hat: every(1, bars),
    cymbal: seed([0, 6, 8, 14], bars), // Multiple crashes
  }),
  "Trap": ({ bars }) => ({
    kick: seed([0, 4, 8, 12], bars), // Heavy on beats
    snare: seed([6, 14], bars), // Syncopated snare
    hat: seed([1, 2, 3, 5, 7, 9, 10, 11, 13, 15], bars), // Rapid fire hats
    cymbal: seed([0, 8], bars), // Sparse crashes
  }),
  "Ambient": ({ bars }) => ({
    kick: seed([0, 12], bars), // Minimal kick
    snare: seed([8], bars), // Single snare
    hat: seed([4, 6, 10, 14], bars), // Sparse hats
    cymbal: seed([0, 7, 15], bars), // Atmospheric crashes
  }),
};

// Helpers to build patterns
function seed(indices, bars) {
  const arr = emptyPattern(bars);
  for (let b = 0; b < bars; b++) {
    indices.forEach((i) => (arr[b * STEPS_PER_BAR + i] = 1));
  }
  return arr;
}
function every(n, bars) {
  const arr = emptyPattern(bars);
  for (let i = 0; i < arr.length; i += n) arr[i] = 1;
  return arr;
}
function mix(a, b) {
  return a.map((v, i) => (v || b[i] ? 1 : 0));
}

export default function Drumcomputer() {
  // Transport & feel
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(100);
  const [bars, setBars] = useState(2); // 1–4
  const [swing, setSwing] = useState(0); // 0–60 (%)
  
  // Tap Tempo
  const [tapTimes, setTapTimes] = useState([]);
  const [tapActive, setTapActive] = useState(false);
  const tapTimeoutRef = useRef(null);
  const tapActiveTimeoutRef = useRef(null);

  // Practice gaps (macro-timing): silence windows
  const [gapEveryBars, setGapEveryBars] = useState(4); // silence every N bars
  const [gapLengthBars, setGapLengthBars] = useState(1); // for M bars
  const [gapsEnabled, setGapsEnabled] = useState(false);
  
  // Drone function
  const [droneEnabled, setDroneEnabled] = useState(false);
  const [droneNote, setDroneNote] = useState(33); // MIDI note number (A1)
  const droneOscRef = useRef(null);
  const droneGainRef = useRef(null);

  // Patterns (state + refs to avoid stale-closure during playback)
  const [kick, setKick] = useState(() => presets["Classic 1"]({ bars: 2 }).kick);
  const [snare, setSnare] = useState(() => presets["Classic 1"]({ bars: 2 }).snare);
  const [hat, setHat] = useState(() => presets["Classic 1"]({ bars: 2 }).hat);
  const [cymbal, setCymbal] = useState(() => emptyPattern(2)); // New cymbal track
  const kickRef = useRef(kick);
  const snareRef = useRef(snare);
  const hatRef = useRef(hat);
  const cymbalRef = useRef(cymbal);
  useEffect(() => { kickRef.current = kick; }, [kick]);
  useEffect(() => { snareRef.current = snare; }, [snare]);
  useEffect(() => { hatRef.current = hat; }, [hat]);
  useEffect(() => { cymbalRef.current = cymbal; }, [cymbal]);

  // Audio context & scheduler refs
  const audioCtxRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const currentStepRef = useRef(0); // 0..bars*16-1
  const scheduleTimerRef = useRef(null);
  const lookaheadRef = useRef(25); // ms interval for scheduler
  const scheduleAheadTimeRef = useRef(0.12); // seconds to schedule ahead
  const bpmRef = useRef(bpm); // Live BPM reference
  const swingRef = useRef(swing); // Live swing reference
  const barsRef = useRef(bars); // Live bars reference
  const gapsEnabledRef = useRef(gapsEnabled); // Live gaps reference
  const gapEveryBarsRef = useRef(gapEveryBars);
  const gapLengthBarsRef = useRef(gapLengthBars);

  // Update refs when values change
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { barsRef.current = bars; }, [bars]);
  useEffect(() => { gapsEnabledRef.current = gapsEnabled; }, [gapsEnabled]);
  useEffect(() => { gapEveryBarsRef.current = gapEveryBars; }, [gapEveryBars]);
  useEffect(() => { gapLengthBarsRef.current = gapLengthBars; }, [gapLengthBars]);

  // Visual playhead: UI reads this from a rAF loop
  const [uiStep, setUiStep] = useState(0);
  const rafRef = useRef(0);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent default for space to avoid page scroll
      if (e.code === 'Space') {
        e.preventDefault();
        handleToggle();
      }
      // T key for tap tempo
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        handleTapTempo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying]); // Dependency on isPlaying to ensure correct toggle state

  // Recreate/resize patterns when number of bars changes
  useEffect(() => {
    setKick((prev) => resizePattern(prev, bars));
    setSnare((prev) => resizePattern(prev, bars));
    setHat((prev) => resizePattern(prev, bars));
    setCymbal((prev) => resizePattern(prev, bars));
    // Reset current step if it's beyond the new range
    if (currentStepRef.current >= bars * STEPS_PER_BAR) {
      currentStepRef.current = 0;
    }
  }, [bars]);

  // Derived totals
  const totalSteps = useMemo(() => bars * STEPS_PER_BAR, [bars]);

  // Create audio context lazily on first start
  const ensureAudio = async () => {
    if (!audioCtxRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
    }
  };

  // Basic 808-ish sound designers -----------------------------------------
  const triggerKick = (time) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    // Sine drop for thumpy kick
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.15);
    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.2);
  };

  const triggerSnare = (time) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    // Noise burst + short body tone
    const noise = ctx.createBufferSource();
    noise.buffer = makeNoiseBuffer(ctx, 0.25);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "highpass";
    noiseFilter.frequency.value = 800;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.3, time);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    osc.frequency.setValueAtTime(180, time);

    osc.connect(bodyGain).connect(ctx.destination);
    noise.start(time);
    noise.stop(time + 0.2);
    osc.start(time);
    osc.stop(time + 0.15);
  };

  const triggerHat = (time) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    // Bright noise hat
    const noise = ctx.createBufferSource();
    noise.buffer = makeNoiseBuffer(ctx, 0.1);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 8000;
    bp.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
    noise.connect(bp).connect(gain).connect(ctx.destination);
    noise.start(time);
    noise.stop(time + 0.08);
  };

  const triggerCymbal = (time) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    // Crash cymbal - longer, shimmering noise
    const noise = ctx.createBufferSource();
    noise.buffer = makeNoiseBuffer(ctx, 2.0);
    
    // Multiple filters for metallic sound
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 3000;
    highpass.Q.value = 0.5;
    
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 10000;
    bandpass.Q.value = 2;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.2, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 1.5);
    
    noise.connect(highpass).connect(bandpass).connect(gain).connect(ctx.destination);
    noise.start(time);
    noise.stop(time + 2.0);
  };

  function makeNoiseBuffer(ctx, lengthSec = 0.2) {
    // White noise buffer generator
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, lengthSec * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Drone functions --------------------------------------------------------- ---------------------------------------------------------
  const startDrone = () => {
    if (!audioCtxRef.current || droneOscRef.current) return;
    
    const ctx = audioCtxRef.current;
    
    // Create oscillator for drone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    // Configure drone sound - much smoother
    osc.type = "triangle"; // Triangle wave is smoother than sawtooth
    osc.frequency.setValueAtTime(midiToFreq(droneNote), ctx.currentTime);
    
    // Add gentle filtering for warmth
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, ctx.currentTime); // Lower cutoff for smoother sound
    filter.Q.setValueAtTime(1, ctx.currentTime); // Lower Q for gentler filtering
    
    // Much quieter and gentler fade in
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1.0); // Slower fade-in, much quieter
    
    // Connect and start
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start();
    
    // Store references
    droneOscRef.current = osc;
    droneGainRef.current = gain;
  };

  const stopDrone = () => {
    if (!audioCtxRef.current || !droneOscRef.current) return;
    
    const ctx = audioCtxRef.current;
    
    // Gentle fade out
    if (droneGainRef.current) {
      droneGainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8); // Slower fade-out
    }
    
    // Stop oscillator
    if (droneOscRef.current) {
      droneOscRef.current.stop(ctx.currentTime + 0.8);
      droneOscRef.current = null;
      droneGainRef.current = null;
    }
  };

  // Handle drone toggle
  useEffect(() => {
    if (droneEnabled) {
      ensureAudio().then(() => {
        startDrone();
      });
    } else {
      stopDrone();
    }
    
    return () => {
      stopDrone();
    };
  }, [droneEnabled, droneNote]);

  // Swing timing helper -----------------------------------------------------
  const swingOffsetForStep = (stepIndex) => {
    // Apply swing to off-beat 16ths (odd indices).
    // A 16th duration is (60/BPM) / 4.
    const sixteenth = (60 / bpmRef.current) / 4;
    const isOffbeat = stepIndex % 2 === 1; // odd index => off-beat
    const swingPct = swingRef.current / 100; // 0..0.6 typical
    return isOffbeat ? swingPct * sixteenth * 0.5 : 0; // push later by up to half a 16th * swingPct
  };

  // Practice gap helper -----------------------------------------------------
  const isInGap = (absoluteStep) => {
    if (!gapsEnabledRef.current) return false;
    if (gapEveryBarsRef.current <= 0) return false;
    const barIndex = Math.floor(absoluteStep / STEPS_PER_BAR); // 0-based bar
    const cyclePos = barIndex % gapEveryBarsRef.current; // 0..gapEveryBars-1
    // Silence the last `gapLengthBars` of each gap cycle
    return cyclePos >= (gapEveryBarsRef.current - gapLengthBarsRef.current);
  };

  // Transport handlers ------------------------------------------------------
  const handleStart = async () => {
    await ensureAudio();
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") await ctx.resume();
    currentStepRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime + 0.05; // short offset for stability
    setIsPlaying(true);
    scheduleTimerRef.current = setInterval(scheduler, lookaheadRef.current);
    // Start a UI rAF loop so the playhead is clearly visible
    const tick = () => {
      setUiStep(currentStepRef.current % (barsRef.current * STEPS_PER_BAR));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const handleStop = () => {
    setIsPlaying(false);
    if (scheduleTimerRef.current) clearInterval(scheduleTimerRef.current);
    scheduleTimerRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    currentStepRef.current = 0;
    setUiStep(0);
  };

  const handleToggle = () => (isPlaying ? handleStop() : handleStart());

  // Tap Tempo handler -------------------------------------------------------
  const handleTapTempo = () => {
    const now = Date.now();
    
    // Visual feedback
    setTapActive(true);
    if (tapActiveTimeoutRef.current) clearTimeout(tapActiveTimeoutRef.current);
    tapActiveTimeoutRef.current = setTimeout(() => setTapActive(false), 100);
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    
    setTapTimes(prev => {
      const newTaps = [...prev, now].slice(-8); // Keep last 8 taps max
      
      // Calculate BPM if we have at least 2 taps
      if (newTaps.length >= 2) {
        const intervals = [];
        for (let i = 1; i < newTaps.length; i++) {
          intervals.push(newTaps[i] - newTaps[i - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const calculatedBpm = Math.round(60000 / avgInterval);
        
        // Clamp to valid range
        if (calculatedBpm >= 50 && calculatedBpm <= 220) {
          setBpm(calculatedBpm);
        }
      }
      
      return newTaps;
    });
    
    // Reset tap array after 2 seconds of no taps
    tapTimeoutRef.current = setTimeout(() => {
      setTapTimes([]);
    }, 2000);
  };

  // Core scheduler: schedules notes slightly ahead of time ------------------
  const scheduler = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const secondsPerBeat = 60.0 / bpmRef.current;
    const sixteenth = secondsPerBeat / 4;
    const total = barsRef.current * STEPS_PER_BAR;

    while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTimeRef.current) {
      const step = currentStepRef.current % total; // wrap within loop
      const swingOffset = swingOffsetForStep(step);
      const t = nextNoteTimeRef.current + swingOffset;

      // Determine if this step is in a gap window
      const muted = isInGap(step);

      // Read latest patterns from refs to ensure live edits are respected
      const k = kickRef.current;
      const s = snareRef.current;
      const h = hatRef.current;
      const c = cymbalRef.current;

      if (!muted && step < k.length && step < s.length && step < h.length && step < c.length) {
        if (k[step]) triggerKick(t);
        if (s[step]) triggerSnare(t);
        if (h[step]) triggerHat(t);
        if (c[step]) triggerCymbal(t);
      }

      // Advance to next 16th
      nextNoteTimeRef.current += sixteenth;
      currentStepRef.current = (currentStepRef.current + 1) % total;
    }
  };

  // Live-edit helper: schedule a just-toggled-on step if it lands soon ------
  const scheduleIfSoon = (trackName, stepIndex) => {
    if (!isPlaying) return;
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const total = barsRef.current * STEPS_PER_BAR;
    const secondsPerBeat = 60.0 / bpmRef.current;
    const sixteenth = secondsPerBeat / 4;

    const stepNow = currentStepRef.current % total;
    const stepsAhead = (stepIndex - stepNow + total) % total; // 0..total-1
    const t = nextNoteTimeRef.current + stepsAhead * sixteenth + swingOffsetForStep(stepIndex);

    // Only schedule if within the lookahead horizon and not muted
    if (t >= ctx.currentTime && t <= ctx.currentTime + scheduleAheadTimeRef.current) {
      if (!isInGap(stepIndex)) {
        if (trackName === "Kick") triggerKick(t);
        if (trackName === "Snare") triggerSnare(t);
        if (trackName === "Hi-Hat") triggerHat(t);
        if (trackName === "Cymbal") triggerCymbal(t);
      }
    }
  };

  // UI helpers --------------------------------------------------------------
  const toggleStep = (trackName, setTrack, idx) => {
    setTrack((prev) => {
      const next = [...prev]; // Create a proper copy
      next[idx] = prev[idx] ? 0 : 1; // Toggle between 0 and 1
      
      // Update refs immediately to avoid stale read between setState and scheduler tick
      if (trackName === "Kick") kickRef.current = next;
      if (trackName === "Snare") snareRef.current = next;
      if (trackName === "Hi-Hat") hatRef.current = next;
      if (trackName === "Cymbal") cymbalRef.current = next;
      
      // If the user just turned a step ON (from 0 to 1), try to schedule it right away
      if (!prev[idx] && next[idx]) {
        scheduleIfSoon(trackName, idx);
      }
      
      return next;
    });
  };

  const clearAll = () => {
    const k = emptyPattern(bars);
    const s = emptyPattern(bars);
    const h = emptyPattern(bars);
    const c = emptyPattern(bars);
    setKick(k); 
    setSnare(s); 
    setHat(h);
    setCymbal(c);
    // Update refs immediately for live playback
    kickRef.current = k;
    snareRef.current = s;
    hatRef.current = h;
    cymbalRef.current = c;
  };

  const loadPreset = (name) => {
    const p = presets[name]({ bars });
    setKick(p.kick); 
    setSnare(p.snare); 
    setHat(p.hat);
    setCymbal(p.cymbal || emptyPattern(bars)); // Cymbal optional in presets
    // Update refs immediately for live playback
    kickRef.current = p.kick;
    snareRef.current = p.snare;
    hatRef.current = p.hat;
    cymbalRef.current = p.cymbal || emptyPattern(bars);
  };

  // Simple step grid component
  const TrackGrid = ({ name, pattern, setPattern, colorClass, playhead }) => {
    // Calculate actual playhead position based on current bars
    const displayPlayhead = isPlaying ? playhead : -1;
    
    const handleStepClick = (index) => {
      toggleStep(name, setPattern, index);
    };
    
    return (
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-neutral-700">{name}</span>
            <div className="w-1.5 h-1.5 bg-current rounded-full opacity-60"></div>
          </div>
          <span className="text-xs text-neutral-500 font-mono bg-neutral-100/60 px-2 py-1 rounded-lg backdrop-blur-sm">
            {pattern.filter((x) => !!x).length}/{pattern.length}
          </span>
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${STEPS_PER_BAR * bars}, minmax(0, 1fr))` }}>
          {pattern.map((value, i) => {
            const barBreak = i % STEPS_PER_BAR === 0;
            const isBeat = i % 4 === 0;
            const isPlayhead = displayPlayhead === i;
            const isActive = value === 1 || value === true; // Handle both 1 and true
            
            return (
              <button
                key={`${name}-${i}-${value}`} // Include value in key to force re-render
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleStepClick(i);
                }}
                className={[
                  "h-11 rounded-2xl border relative cursor-pointer select-none transition-all duration-150 hover:scale-105 active:scale-95", 
                  isActive
                    ? `${colorClass} border-transparent` 
                    : "bg-white/80 backdrop-blur-sm border-neutral-200/60 hover:border-neutral-300/80 hover:bg-white/90",
                  isBeat && !isActive ? "border-neutral-300/80 shadow-sm" : "",
                  barBreak && i !== 0 ? "ml-2" : "",
                  isPlayhead ? "ring-2 ring-yellow-400/80 ring-offset-2" : "",
                ].join(" ")}
                aria-label={`${name} step ${i + 1} ${isActive ? 'active' : 'inactive'}`}
                type="button"
              >
                {/* playhead indicator - nur Ring, keine Linie */}
                {/* Step number on beat 1 of each bar */}
                {i % STEPS_PER_BAR === 0 && (
                  <span className="absolute -top-3 -left-1 text-[9px] text-neutral-400 font-mono font-bold pointer-events-none bg-white/60 px-1 rounded">
                    {Math.floor(i / STEPS_PER_BAR) + 1}
                  </span>
                )}
                {/* Visual indicator for active steps */}
                {isActive && (
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="w-2.5 h-2.5 bg-white/40 rounded-full backdrop-blur-sm"></span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-zinc-50 via-neutral-50 to-stone-50 text-neutral-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-700 rounded-xl flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-white/90"></div>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-600 bg-clip-text text-transparent">
              Drumcomputer
            </h1>
            <span className="px-2 py-1 bg-neutral-100/80 backdrop-blur-sm text-neutral-600 text-xs rounded-full font-medium border border-neutral-200/50">80s/90s</span>
          </div>
          <p className="text-sm text-neutral-500">
            Live editing • Visual playhead • Swing • Practice Gaps • {totalSteps} steps
          </p>
        </header>

        {/* Transport & global controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/70 backdrop-blur-sm border border-neutral-200/60 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                Transport
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTapTempo}
                  className={`px-3 py-2 rounded-2xl text-sm font-medium transition-all duration-200 active:scale-95 ${
                    tapActive 
                      ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-neutral-900 shadow-lg shadow-yellow-400/25" 
                      : "bg-neutral-100/80 hover:bg-neutral-200/80 text-neutral-700 backdrop-blur-sm"
                  }`}
                  title={`Tap tempo (T)${tapTimes.length > 0 ? ` - ${tapTimes.length} taps` : ' - tap at least 2 times'}`}
                >
                  Tap {tapTimes.length > 0 && `(${tapTimes.length})`}
                </button>
                <button
                  onClick={handleToggle}
                  className={`px-6 py-2.5 rounded-2xl font-semibold transition-all duration-200 active:scale-95 ${
                    isPlaying 
                      ? "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25" 
                      : "bg-gradient-to-r from-neutral-900 to-neutral-800 text-white hover:from-neutral-800 hover:to-neutral-700 shadow-lg shadow-neutral-900/25"
                  }`}
                  title="Start/Stop (Space)"
                >
                  {isPlaying ? "Stop" : "Start"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => loadPreset("Classic 1")} className="text-xs px-3 py-2 rounded-xl bg-neutral-100/60 hover:bg-neutral-200/60 text-neutral-700 transition-all duration-200 backdrop-blur-sm border border-neutral-200/40">Classic 1</button>
              <button onClick={() => loadPreset("Classic 2")} className="text-xs px-3 py-2 rounded-xl bg-neutral-100/60 hover:bg-neutral-200/60 text-neutral-700 transition-all duration-200 backdrop-blur-sm border border-neutral-200/40">Classic 2</button>
              <button onClick={() => loadPreset("New Jack")} className="text-xs px-3 py-2 rounded-xl bg-neutral-100/60 hover:bg-neutral-200/60 text-neutral-700 transition-all duration-200 backdrop-blur-sm border border-neutral-200/40">New Jack</button>
              <button onClick={() => loadPreset("Breakbeat")} className="text-xs px-3 py-2 rounded-xl bg-neutral-100/60 hover:bg-neutral-200/60 text-neutral-700 transition-all duration-200 backdrop-blur-sm border border-neutral-200/40">Breakbeat</button>
              <button onClick={() => loadPreset("Four Floor")} className="text-xs px-3 py-2 rounded-xl bg-neutral-100/60 hover:bg-neutral-200/60 text-neutral-700 transition-all duration-200 backdrop-blur-sm border border-neutral-200/40">Four Floor</button>
              <button onClick={() => loadPreset("Jungle")} className="text-xs px-3 py-2 rounded-xl bg-neutral-100/60 hover:bg-neutral-200/60 text-neutral-700 transition-all duration-200 backdrop-blur-sm border border-neutral-200/40">Jungle</button>
              <button onClick={() => loadPreset("Trap")} className="text-xs px-3 py-2 rounded-xl bg-neutral-100/60 hover:bg-neutral-200/60 text-neutral-700 transition-all duration-200 backdrop-blur-sm border border-neutral-200/40">Trap</button>
              <button onClick={() => loadPreset("Ambient")} className="text-xs px-3 py-2 rounded-xl bg-neutral-100/60 hover:bg-neutral-200/60 text-neutral-700 transition-all duration-200 backdrop-blur-sm border border-neutral-200/40">Ambient</button>
              <button onClick={clearAll} className="col-span-2 text-xs px-3 py-2 rounded-xl border border-red-200/60 hover:bg-red-50/60 text-red-600 transition-all duration-200 backdrop-blur-sm">Clear All</button>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm border border-neutral-200/60 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="text-sm font-semibold text-neutral-700 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Tempo & Swing
            </div>
            <div className="mb-4">
              <label className="text-xs text-neutral-600 flex justify-between mb-2">
                <span>Tempo</span>
                <span className="font-mono font-bold text-neutral-900 bg-neutral-100/60 px-2 py-1 rounded-lg">{bpm} BPM</span>
              </label>
              <div className="relative">
                <input 
                  type="range" 
                  min={50} 
                  max={220} 
                  value={bpm} 
                  onChange={(e) => setBpm(parseInt(e.target.value))} 
                  className="w-full h-2 bg-neutral-200/60 rounded-full appearance-none cursor-pointer slider"
                />
                <style jsx>{`
                  .slider::-webkit-slider-thumb {
                    appearance: none;
                    height: 18px;
                    width: 18px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #1f2937, #374151);
                    cursor: pointer;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
                    border: 2px solid white;
                  }
                  .slider::-moz-range-thumb {
                    height: 18px;
                    width: 18px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #1f2937, #374151);
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
                  }
                `}</style>
              </div>
            </div>
            <div>
              <label className="text-xs text-neutral-600 flex justify-between mb-2">
                <span>Swing</span>
                <span className="font-mono font-bold text-neutral-900 bg-neutral-100/60 px-2 py-1 rounded-lg">{swing}%</span>
              </label>
              <div className="relative">
                <input 
                  type="range" 
                  min={0} 
                  max={60} 
                  value={swing} 
                  onChange={(e) => setSwing(parseInt(e.target.value))} 
                  className="w-full h-2 bg-neutral-200/60 rounded-full appearance-none cursor-pointer slider"
                />
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm border border-neutral-200/60 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="text-sm font-semibold text-neutral-700 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Loop & Gaps
            </div>
            <div className="mb-4">
              <label className="text-xs text-neutral-600 flex justify-between mb-2">
                <span>Bars</span>
                <span className="font-mono font-bold text-neutral-900 bg-neutral-100/60 px-2 py-1 rounded-lg">{bars}</span>
              </label>
              <input 
                type="range" 
                min={1} 
                max={MAX_BARS} 
                value={bars} 
                onChange={(e) => setBars(parseInt(e.target.value))} 
                className="w-full h-2 bg-neutral-200/60 rounded-full appearance-none cursor-pointer slider"
              />
            </div>
            <div className="flex items-center justify-between mb-3 p-2 bg-neutral-100/40 rounded-xl backdrop-blur-sm">
              <label className="text-xs font-medium text-neutral-700">Practice Gaps</label>
              <div className="relative">
                <input 
                  type="checkbox" 
                  checked={gapsEnabled} 
                  onChange={(e) => setGapsEnabled(e.target.checked)} 
                  className="w-4 h-4 text-neutral-900 bg-neutral-100 border-neutral-300 rounded focus:ring-neutral-500 focus:ring-2"
                />
              </div>
            </div>
            <div className={`grid grid-cols-2 gap-3 transition-all duration-200 ${gapsEnabled ? 'opacity-100' : 'opacity-40'}`}>
              <div>
                <label className="text-xs text-neutral-600 mb-1 block">
                  Every: <span className="font-mono font-bold">{gapEveryBars}</span>
                </label>
                <input 
                  type="range" 
                  min={2} 
                  max={8} 
                  value={gapEveryBars} 
                  onChange={(e) => setGapEveryBars(parseInt(e.target.value))} 
                  className="w-full h-2 bg-neutral-200/60 rounded-full appearance-none cursor-pointer slider"
                  disabled={!gapsEnabled}
                />
              </div>
              <div>
                <label className="text-xs text-neutral-600 mb-1 block">
                  Gap: <span className="font-mono font-bold">{gapLengthBars}</span>
                </label>
                <input 
                  type="range" 
                  min={1} 
                  max={4} 
                  value={gapLengthBars} 
                  onChange={(e) => setGapLengthBars(parseInt(e.target.value))} 
                  className="w-full h-2 bg-neutral-200/60 rounded-full appearance-none cursor-pointer slider"
                  disabled={!gapsEnabled}
                />
              </div>
            </div>
            <p className="text-[10px] text-neutral-500 mt-3 bg-neutral-50/60 p-2 rounded-lg">Silence pattern for timing practice</p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm">
            <div className="text-sm font-medium text-neutral-700 mb-3">Drone</div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-neutral-600">Enable Drone</label>
              <input 
                type="checkbox" 
                checked={droneEnabled} 
                onChange={(e) => setDroneEnabled(e.target.checked)} 
                className="accent-neutral-900"
              />
            </div>
            <div className={`${droneEnabled ? 'opacity-100' : 'opacity-40'}`}>
              <label className="text-xs text-neutral-600 flex justify-between">
                <span>Note</span>
                <span className="font-mono font-medium text-neutral-900">
                  {getNoteNameFromMidi(droneNote)} ({midiToFreq(droneNote).toFixed(1)} Hz)
                </span>
              </label>
              <input 
                type="range" 
                min={21}  // A0
                max={48}  // C3
                value={droneNote} 
                onChange={(e) => setDroneNote(parseInt(e.target.value))} 
                className="w-full mt-1 accent-neutral-900" 
                disabled={!droneEnabled}
              />
              <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
                <span>A0</span>
                <span>Bass Range</span>
                <span>C3</span>
              </div>
              <div className="flex gap-1 mt-2">
                <button onClick={() => setDroneNote(33)} className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors" disabled={!droneEnabled}>A1</button>
                <button onClick={() => setDroneNote(34)} className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors" disabled={!droneEnabled}>A#1</button>
                <button onClick={() => setDroneNote(35)} className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors" disabled={!droneEnabled}>B1</button>
                <button onClick={() => setDroneNote(36)} className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors" disabled={!droneEnabled}>C2</button>
                <button onClick={() => setDroneNote(37)} className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors" disabled={!droneEnabled}>C#2</button>
                <button onClick={() => setDroneNote(38)} className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors" disabled={!droneEnabled}>D2</button>
              </div>
              <div className="flex gap-1 mt-1">
                <button onClick={() => setDroneNote(39)} className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors" disabled={!droneEnabled}>D#2</button>
                <button onClick={() => setDroneNote(40)} className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors" disabled={!droneEnabled}>E2</button>
                <button onClick={() => setDroneNote(41)} className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors" disabled={!droneEnabled}>F2</button>
                <button onClick={() => setDroneNote(42)} className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors" disabled={!droneEnabled}>F#2</button>
                <button onClick={() => setDroneNote(43)} className="text-xs px-2 py-1.5 rounded-lg bg-neutral-100/60 hover:bg-neutral-200/60 text-neutral-700 transition-all duration-200 backdrop-blur-sm border border-neutral-200/40" disabled={!droneEnabled}>G2</button>
                <button onClick={() => setDroneNote(44)} className="text-xs px-2 py-1.5 rounded-lg bg-neutral-100/60 hover:bg-neutral-200/60 text-neutral-700 transition-all duration-200 backdrop-blur-sm border border-neutral-200/40" disabled={!droneEnabled}>G#2</button>
              </div>
            </div>
            <p className="text-[10px] text-neutral-500 mt-3 bg-neutral-50/60 p-2 rounded-lg">Bass drone for tonal reference</p>
          </div>
        </div>

        {/* Sequencer */}
        <div className="bg-white/70 backdrop-blur-sm border border-neutral-200/60 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"></div>
              <h2 className="text-sm font-semibold text-neutral-700">Pattern Sequencer</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-100/40 px-3 py-2 rounded-full backdrop-blur-sm">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
              <span>Playhead</span>
            </div>
          </div>
          <TrackGrid name="Kick" pattern={kick} setPattern={setKick} colorClass="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25" playhead={uiStep} />
          <TrackGrid name="Snare" pattern={snare} setPattern={setSnare} colorClass="bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/25" playhead={uiStep} />
          <TrackGrid name="Hi-Hat" pattern={hat} setPattern={setHat} colorClass="bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/25" playhead={uiStep} />
          <TrackGrid name="Cymbal" pattern={cymbal} setPattern={setCymbal} colorClass="bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25" playhead={uiStep} />
          <div className="mt-6 pt-6 border-t border-neutral-200/60">
            <div className="flex items-center gap-2 text-[11px] text-neutral-500 bg-gradient-to-r from-neutral-50/80 to-neutral-100/80 p-3 rounded-2xl backdrop-blur-sm border border-neutral-200/40">
              <span className="text-lg">💡</span>
              <div>
                <strong>Tip:</strong> Enable swing for groove • Use gaps to practice internal timing • Live-edit while playing
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-8 text-center text-[11px] text-neutral-500">
          <div className="bg-neutral-100/40 backdrop-blur-sm rounded-2xl p-4 border border-neutral-200/40">
            <p className="mb-2">Drumcomputer by <strong>Lukas Schönsgibl</strong> • <a href="https://schoensgibl.com" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-700 transition-colors">schoensgibl.com</a></p>
            <p className="mb-2">Vibe Coded with Claude</p>
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-white/70 text-neutral-700 rounded-lg text-[10px] font-mono border border-neutral-200/60 shadow-sm">Space</kbd>
                <span>Start/Stop</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-white/70 text-neutral-700 rounded-lg text-[10px] font-mono border border-neutral-200/60 shadow-sm">T</kbd>
                <span>Tap Tempo</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function resizePattern(prev, bars) {
  const newLen = bars * STEPS_PER_BAR;
  const next = emptyPattern(bars);
  for (let i = 0; i < Math.min(prev.length, newLen); i++) next[i] = prev[i];
  return next;
}
