// NEUE LIVE-EDIT FUNKTION FÜR SOFORTIGES AUDIO FEEDBACK

const scheduleIfSoon = (trackName, stepIndex) => {
  console.log(`🎯 scheduleIfSoon called: ${trackName}[${stepIndex}], isPlaying: ${isPlaying}`);
  
  const ctx = audioCtxRef.current;
  if (!ctx) {
    console.log(`❌ No audio context`);
    return;
  }

  // SOFORTIGER SOUND - IMMER (auch bei Pause)
  console.log(`🔊 TRIGGERING IMMEDIATE SOUND: ${trackName}`);
  const now = ctx.currentTime;

  try {
    if (trackName === "Kick") {
      console.log(`🥁 IMMEDIATE Kick sound`);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
      gain.gain.setValueAtTime(1.5, now); // LOUD
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    }
    
    if (trackName === "Snare") {
      console.log(`🥁 IMMEDIATE Snare sound`);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, now);
      gain.gain.setValueAtTime(1.0, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    }
    
    if (trackName === "Hi-Hat") {
      console.log(`🥁 IMMEDIATE Hi-Hat sound`);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(8000, now);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    }
    
    if (trackName === "Cymbal") {
      console.log(`🥁 IMMEDIATE Cymbal sound`);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(2000, now);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.3);
      gain.gain.setValueAtTime(0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    }
    
    console.log(`✅ IMMEDIATE SOUND SUCCESSFUL: ${trackName}`);
  } catch (error) {
    console.error(`❌ Error triggering immediate ${trackName}:`, error);
  }

  // Zukünftige Scheduling nur wenn playing
  if (!isPlaying) {
    console.log(`⏸️ Not playing, only immediate sound triggered`);
    return;
  }

  // Schedule für Loop (optional)
  const total = barsRef.current * STEPS_PER_BAR;
  const secondsPerBeat = 60.0 / bpmRef.current;
  const sixteenth = secondsPerBeat / 4;
  const stepNow = currentStepRef.current % total;
  const stepsAhead = (stepIndex - stepNow + total) % total;
  const t = nextNoteTimeRef.current + stepsAhead * sixteenth + swingOffsetForStep(stepIndex);

  if (t >= ctx.currentTime && t <= ctx.currentTime + scheduleAheadTimeRef.current) {
    if (!isInGap(stepIndex)) {
      console.log(`✅ Scheduling future occurrence of ${trackName}[${stepIndex}]`);
      if (trackName === "Kick") triggerKick(t);
      if (trackName === "Snare") triggerSnare(t);
      if (trackName === "Hi-Hat") triggerHat(t);
      if (trackName === "Cymbal") triggerCymbal(t);
    }
  }
};