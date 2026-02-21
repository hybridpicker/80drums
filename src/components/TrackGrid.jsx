import React, { useCallback } from 'react';
import { STEPS_PER_BAR, ACCENT_RING } from '../utils/patternHelpers';

const TrackGrid = React.memo(function TrackGrid({
  trackId, name, pattern, colorClass, playhead, isPlaying,
  isMobileDevice, bars, activeMobileBar, setActiveMobileBar,
  onToggleStep, volume, mute, solo, onVolumeChange, onMuteToggle, onSoloToggle,
  isDragging, onDragStart, onDragEnter,
  onCopy, onPaste, hasClipboard, darkMode,
}) {
  const displayPlayhead = isPlaying ? playhead : -1;

  const isMobile = isMobileDevice;
  const currentBarPattern = isMobile
    ? pattern.slice(activeMobileBar * STEPS_PER_BAR, (activeMobileBar + 1) * STEPS_PER_BAR)
    : pattern;
  const patternOffset = isMobile ? activeMobileBar * STEPS_PER_BAR : 0;

  const handleStepInteraction = useCallback((actualIndex, e) => {
    e.preventDefault();
    onToggleStep(trackId, actualIndex);
  }, [trackId, onToggleStep]);

  const activeCount = pattern.filter((x) => !!x).length;

  return (
    <div className="mb-3 sm:mb-4 md:mb-5">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-1.5 sm:gap-3">
          <span className="text-xs sm:text-sm font-semibold text-neutral-700 min-w-[4rem]">{name}</span>
          {/* Mixer inline controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onMuteToggle(trackId)}
              className={`text-[10px] w-6 h-6 rounded-md font-mono font-bold transition-all active:scale-95 ${
                mute
                  ? 'bg-red-500 text-white shadow-sm shadow-red-500/30'
                  : darkMode ? 'bg-neutral-700/80 text-neutral-400 hover:bg-red-900/60 hover:text-red-400' : 'bg-neutral-100/80 text-neutral-400 hover:bg-red-50 hover:text-red-500'
              }`}
              title="Mute"
            >M</button>
            <button
              onClick={() => onSoloToggle(trackId)}
              className={`text-[10px] w-6 h-6 rounded-md font-mono font-bold transition-all active:scale-95 ${
                solo
                  ? 'bg-amber-400 text-neutral-900 shadow-sm shadow-amber-400/30'
                  : darkMode ? 'bg-neutral-700/80 text-neutral-400 hover:bg-amber-900/60 hover:text-amber-400' : 'bg-neutral-100/80 text-neutral-400 hover:bg-amber-50 hover:text-amber-600'
              }`}
              title="Solo"
            >S</button>
            <input
              type="range"
              min={0} max={100} value={volume}
              onChange={(e) => onVolumeChange(trackId, parseInt(e.target.value))}
              className="w-12 sm:w-16 h-1 slider opacity-50 hover:opacity-100 transition-opacity"
              title={`Volume: ${volume}%`}
            />
            {onCopy && (
              <button
                onClick={() => onCopy(trackId)}
                className={`text-[10px] w-6 h-6 rounded-md font-mono font-bold transition-all active:scale-95 hidden sm:flex items-center justify-center ${
                  darkMode
                    ? 'bg-neutral-700/80 text-neutral-400 hover:bg-sky-900/60 hover:text-sky-400'
                    : 'bg-neutral-100/80 text-neutral-400 hover:bg-sky-50 hover:text-sky-600'
                }`}
                title="Track-Pattern kopieren"
              >C</button>
            )}
            {onPaste && hasClipboard && (
              <button
                onClick={() => onPaste(trackId)}
                className={`text-[10px] w-6 h-6 rounded-md font-mono font-bold transition-all active:scale-95 hidden sm:flex items-center justify-center ${
                  darkMode
                    ? 'bg-sky-800/80 text-sky-300 hover:bg-sky-700/80'
                    : 'bg-sky-100 text-sky-600 hover:bg-sky-200'
                }`}
                title="Kopiertes Pattern einfügen"
              >P</button>
            )}
          </div>
        </div>
        <span className="text-[9px] sm:text-xs text-neutral-500 font-mono bg-neutral-100/60 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-center min-w-[2rem] sm:min-w-[2.5rem] backdrop-blur-sm">
          {activeCount}/{pattern.length}
        </span>
      </div>

      {/* Mobile Bar Tabs */}
      {isMobile && bars > 1 && (
        <div className="flex gap-1 mb-3 lg:hidden">
          {Array.from({ length: bars }, (_, barIndex) => (
            <button
              key={barIndex}
              onClick={() => setActiveMobileBar(barIndex)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeMobileBar === barIndex
                  ? 'bg-neutral-900 text-white shadow-lg'
                  : 'bg-neutral-100/60 text-neutral-700 hover:bg-neutral-200/60'
              }`}
            >
              Bar {barIndex + 1}
            </button>
          ))}
        </div>
      )}

      {/* Step Grid */}
      <div
        className={`grid gap-1 sm:gap-1.5 mt-3 lg:mt-6 ${mute ? 'opacity-40' : ''}`}
        style={{ gridTemplateColumns: `repeat(${currentBarPattern.length}, minmax(0, 1fr))` }}
      >
        {currentBarPattern.map((value, i) => {
          const actualIndex = patternOffset + i;
          const isBeat = i % 4 === 0;
          const isPlayhead = displayPlayhead === actualIndex;
          const isActive = value >= 1;
          const isAccent = value === 2;
          const isBarStart = !isMobile && actualIndex % STEPS_PER_BAR === 0 && actualIndex > 0;

          return (
            <button
              key={`${trackId}-${actualIndex}`}
              onMouseDown={(e) => { handleStepInteraction(actualIndex, e); if (onDragStart) onDragStart(trackId, actualIndex, value); }}
              onMouseEnter={(e) => { if (isDragging && onDragEnter) { e.preventDefault(); onDragEnter(trackId, actualIndex); } }}
              onTouchStart={(e) => handleStepInteraction(actualIndex, e)}
              className={[
                isMobile
                  ? "h-12 sm:h-14 rounded-xl"
                  : pattern.length <= 16
                    ? "h-10 sm:h-12 md:h-14 rounded-lg sm:rounded-xl"
                    : "h-8 sm:h-10 md:h-12 rounded-md sm:rounded-lg",
                "border relative cursor-pointer select-none transition-all duration-150",
                isActive
                  ? `${colorClass} border-transparent shadow-sm`
                  : "bg-white/80 backdrop-blur-sm border-neutral-200/60 hover:border-neutral-300/80 hover:bg-white/90 active:bg-neutral-100/60",
                isAccent && isActive ? ACCENT_RING : "",
                isBeat && !isActive ? "border-neutral-300/80 shadow-sm" : "",
                isPlayhead ? "ring-2 ring-yellow-400/80 ring-offset-1 sm:ring-offset-2" : "",
                "active:scale-95 touch-manipulation",
                !isMobile && isBarStart ? "border-l-4 border-l-neutral-300/60" : "",
              ].join(" ")}
              aria-label={`${name} step ${actualIndex + 1} ${isActive ? (isAccent ? 'accent' : 'active') : 'inactive'}`}
              type="button"
            >
              {i % 4 === 0 && (
                <span className="absolute -top-2 sm:-top-3 left-0 text-[8px] sm:text-[9px] text-neutral-400 font-mono font-bold pointer-events-none bg-white/60 px-0.5 sm:px-1 rounded">
                  {(isMobile ? i : actualIndex % STEPS_PER_BAR) + 1}
                </span>
              )}
              {!isMobile && actualIndex % STEPS_PER_BAR === 0 && (
                <span className="absolute -top-6 left-0 text-[10px] text-neutral-500 font-mono font-bold pointer-events-none bg-gradient-to-r from-neutral-100 to-neutral-50 px-1.5 py-0.5 rounded-full border border-neutral-200/60 shadow-sm hidden lg:block">
                  Bar {Math.floor(actualIndex / STEPS_PER_BAR) + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default TrackGrid;
