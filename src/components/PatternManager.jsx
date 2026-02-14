import React, { useState, useEffect } from 'react';
import { getSlots, saveToSlot, loadFromSlot, deleteSlot } from '../utils/patternStorage';

export default function PatternManager({ onSave, onLoad, onShare, onExport, collapsed }) {
  const [slots, setSlots] = useState(() => getSlots());
  const [showSlots, setShowSlots] = useState(false);
  const [slotMode, setSlotMode] = useState(null); // 'save' | 'load'
  const [feedback, setFeedback] = useState(null);

  const refreshSlots = () => setSlots(getSlots());

  const handleSlotAction = (idx) => {
    if (slotMode === 'save') {
      const name = slots[idx]?.name || `Pattern ${idx + 1}`;
      onSave(idx, name);
      refreshSlots();
      setFeedback(`Saved to slot ${idx + 1}`);
      setTimeout(() => { setFeedback(null); setShowSlots(false); setSlotMode(null); }, 1200);
    } else if (slotMode === 'load') {
      const data = loadFromSlot(idx);
      if (data) {
        onLoad(data);
        setFeedback(`Loaded slot ${idx + 1}`);
      } else {
        setFeedback('Empty slot');
      }
      setTimeout(() => { setFeedback(null); setShowSlots(false); setSlotMode(null); }, 1200);
    }
  };

  const handleDelete = (idx, e) => {
    e.stopPropagation();
    deleteSlot(idx);
    refreshSlots();
  };

  const handleShare = () => {
    const url = onShare();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setFeedback('Link copied!');
        setTimeout(() => setFeedback(null), 1500);
      });
    } else {
      // Fallback
      prompt('Copy this URL:', url);
    }
  };

  const handleExport = () => {
    setFeedback('Exporting WAV...');
    onExport().then(() => {
      setFeedback('WAV downloaded!');
      setTimeout(() => setFeedback(null), 1500);
    }).catch(() => {
      setFeedback('Export failed');
      setTimeout(() => setFeedback(null), 1500);
    });
  };

  return (
    <div className={`transition-all duration-300 overflow-hidden ${
      collapsed ? 'max-h-0 opacity-0 lg:max-h-none lg:opacity-100' : 'max-h-[32rem] opacity-100'
    }`}>
      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-1 sm:gap-2 mb-2">
        <button
          onClick={() => { setShowSlots(true); setSlotMode('save'); refreshSlots(); }}
          className="text-[10px] sm:text-xs px-2 py-1.5 sm:py-2 rounded-lg bg-neutral-100/60 hover:bg-neutral-200/60 text-neutral-700 transition-all border border-neutral-200/40"
        >Save</button>
        <button
          onClick={() => { setShowSlots(true); setSlotMode('load'); refreshSlots(); }}
          className="text-[10px] sm:text-xs px-2 py-1.5 sm:py-2 rounded-lg bg-neutral-100/60 hover:bg-neutral-200/60 text-neutral-700 transition-all border border-neutral-200/40"
        >Load</button>
        <button
          onClick={handleShare}
          className="text-[10px] sm:text-xs px-2 py-1.5 sm:py-2 rounded-lg bg-neutral-100/60 hover:bg-neutral-200/60 text-neutral-700 transition-all border border-neutral-200/40"
        >Share URL</button>
        <button
          onClick={handleExport}
          className="text-[10px] sm:text-xs px-2 py-1.5 sm:py-2 rounded-lg bg-neutral-100/60 hover:bg-neutral-200/60 text-neutral-700 transition-all border border-neutral-200/40"
        >Export WAV</button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="text-[10px] sm:text-xs text-center py-1 px-2 mb-2 rounded-lg bg-emerald-100/60 text-emerald-700 font-medium">
          {feedback}
        </div>
      )}

      {/* Slot Grid */}
      {showSlots && (
        <div className="space-y-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] sm:text-[10px] text-neutral-500 font-medium uppercase tracking-wider">
              {slotMode === 'save' ? 'Save to slot' : 'Load from slot'}
            </span>
            <button
              onClick={() => { setShowSlots(false); setSlotMode(null); }}
              className="text-[9px] sm:text-[10px] text-neutral-400 hover:text-neutral-600"
            >Cancel</button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {slots.map((slot, idx) => (
              <button
                key={idx}
                onClick={() => handleSlotAction(idx)}
                className={`relative text-[9px] sm:text-[10px] px-1 py-2 rounded-lg transition-all border ${
                  slot
                    ? 'bg-neutral-200/60 text-neutral-800 border-neutral-300/40 hover:bg-neutral-300/60'
                    : 'bg-neutral-50/40 text-neutral-400 border-neutral-200/30 hover:bg-neutral-100/40'
                }`}
              >
                <span className="block font-mono font-bold">{idx + 1}</span>
                {slot && (
                  <>
                    <span className="block text-[7px] sm:text-[8px] truncate mt-0.5 opacity-60">
                      {new Date(slot.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    {slotMode === 'save' && (
                      <button
                        onClick={(e) => handleDelete(idx, e)}
                        className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 text-white rounded-full text-[7px] leading-none hover:bg-red-500"
                        title="Delete"
                      >x</button>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {!showSlots && (
        <p className="text-[8px] sm:text-[10px] text-neutral-500 mt-1 bg-neutral-50/60 p-1.5 sm:p-2 rounded-lg">
          8 save slots, URL sharing, WAV export
        </p>
      )}
    </div>
  );
}
