import React from 'react';

export default function TempoSwing({ bpm, swing, onBpmChange, onSwingChange, collapsed, onToggle }) {
  return (
    <div className={`transition-all duration-300 overflow-hidden ${
      collapsed ? 'max-h-0 opacity-0 lg:max-h-none lg:opacity-100' : 'max-h-96 opacity-100'
    }`}>
      <div className="mb-3 sm:mb-4">
        <label className="text-[10px] sm:text-xs text-neutral-600 flex justify-between mb-2">
          <span>Tempo</span>
          <span className="font-mono font-bold text-neutral-900 bg-neutral-100/60 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs">{bpm} BPM</span>
        </label>
        <input
          type="range" min={50} max={220} value={bpm}
          onChange={(e) => onBpmChange(parseInt(e.target.value))}
          className="w-full h-2 bg-neutral-200/60 rounded-full appearance-none cursor-pointer slider"
        />
      </div>
      <div>
        <label className="text-[10px] sm:text-xs text-neutral-600 flex justify-between mb-2">
          <span>Swing</span>
          <span className="font-mono font-bold text-neutral-900 bg-neutral-100/60 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs">{swing}%</span>
        </label>
        <input
          type="range" min={0} max={60} value={swing}
          onChange={(e) => onSwingChange(parseInt(e.target.value))}
          className="w-full h-2 bg-neutral-200/60 rounded-full appearance-none cursor-pointer slider"
        />
      </div>
    </div>
  );
}
