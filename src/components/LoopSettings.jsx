import React from 'react';
import { MAX_BARS } from '../utils/patternHelpers';

export default function LoopSettings({ bars, onBarsChange, collapsed, onToggle }) {
  return (
    <div className={`transition-all duration-300 overflow-hidden ${
      collapsed ? 'max-h-0 opacity-0 lg:max-h-none lg:opacity-100' : 'max-h-96 opacity-100'
    }`}>
      <div className="mb-3 sm:mb-4">
        <label className="text-[10px] sm:text-xs text-neutral-600 flex justify-between mb-2">
          <span>Bars</span>
          <span className="font-mono font-bold text-neutral-900 bg-neutral-100/60 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs">{bars}</span>
        </label>
        <input
          type="range" min={1} max={MAX_BARS} value={bars}
          onChange={(e) => onBarsChange(parseInt(e.target.value))}
          className="w-full h-2 bg-neutral-200/60 rounded-full appearance-none cursor-pointer slider"
        />
      </div>
    </div>
  );
}
