import React from 'react';
import { presets } from '../utils/patternHelpers';

export default function GroovePresets({ onLoadPreset, onClear, collapsed, onToggle }) {
  const presetNames = Object.keys(presets);

  return (
    <div className={`grid grid-cols-2 gap-1 sm:gap-2 transition-all duration-300 overflow-hidden ${
      collapsed ? 'max-h-0 opacity-0 lg:max-h-none lg:opacity-100' : 'max-h-96 opacity-100'
    }`}>
      {presetNames.map(name => (
        <button
          key={name}
          onClick={() => onLoadPreset(name)}
          className="text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-neutral-100/60 hover:bg-neutral-200/60 text-neutral-700 transition-all duration-200 backdrop-blur-sm border border-neutral-200/40"
        >{name}</button>
      ))}
      <button
        onClick={onClear}
        className="col-span-2 text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-red-200/60 hover:bg-red-50/60 text-red-600 transition-all duration-200 backdrop-blur-sm"
      >Clear All</button>
    </div>
  );
}
