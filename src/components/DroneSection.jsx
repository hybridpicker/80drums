import React from 'react';
import { midiToFreq, getNoteNameFromMidi } from '../utils/patternHelpers';

export default function DroneSection({ droneEnabled, droneNote, onToggle, onNoteChange, collapsed, onToggleCollapse }) {
  return (
    <div className={`transition-all duration-300 overflow-hidden ${
      collapsed ? 'max-h-0 opacity-0 lg:max-h-none lg:opacity-100' : 'max-h-96 opacity-100'
    }`}>
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <label className="text-[10px] sm:text-xs text-neutral-600">Enable Drone</label>
        <input
          type="checkbox" checked={droneEnabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="w-3 h-3 sm:w-4 sm:h-4 accent-neutral-900"
        />
      </div>
      <div className={`${droneEnabled ? 'opacity-100' : 'opacity-40'}`}>
        <label className="text-[10px] sm:text-xs text-neutral-600 flex justify-between mb-1 sm:mb-2">
          <span>Note</span>
          <span className="font-mono font-medium text-neutral-900 text-[9px] sm:text-[10px] bg-neutral-100/60 px-1 sm:px-1.5 py-0.5 rounded">
            {getNoteNameFromMidi(droneNote)} ({midiToFreq(droneNote).toFixed(1)} Hz)
          </span>
        </label>
        <input
          type="range" min={21} max={48} value={droneNote}
          onChange={(e) => onNoteChange(parseInt(e.target.value))}
          className="w-full mb-1 sm:mb-2 h-2 bg-neutral-200/60 rounded-full appearance-none cursor-pointer slider"
          disabled={!droneEnabled}
        />
        <div className="flex justify-between text-[8px] sm:text-[10px] text-neutral-500 mb-1 sm:mb-2">
          <span>A0</span>
          <span className="hidden sm:inline">Bass Range</span>
          <span>C3</span>
        </div>
        <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
          {[
            [33, 'A1'], [36, 'C2'], [40, 'E2'],
            [43, 'G2'], [45, 'A2'], [48, 'C3']
          ].map(([note, label]) => (
            <button
              key={note}
              onClick={() => onNoteChange(note)}
              className="text-[9px] sm:text-xs px-1 sm:px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
              disabled={!droneEnabled}
            >{label}</button>
          ))}
        </div>
      </div>
      <p className="text-[8px] sm:text-[10px] text-neutral-500 mt-2 sm:mt-3 bg-neutral-50/60 p-1.5 sm:p-2 rounded-lg">Bass drone for tonal reference</p>
    </div>
  );
}
