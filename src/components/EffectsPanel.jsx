import React from 'react';
import { TRACKS } from '../utils/patternHelpers';

export default function EffectsPanel({
  reverbMix, onReverbChange,
  compThreshold, compRatio, onCompThresholdChange, onCompRatioChange,
  voiceParams, onVoiceParamChange,
  collapsed,
}) {
  return (
    <div className={`transition-all duration-300 overflow-hidden ${
      collapsed ? 'max-h-0 opacity-0 lg:max-h-none lg:opacity-100' : 'max-h-[48rem] opacity-100'
    }`}>
      {/* Master Effects */}
      <div className="mb-3">
        <div className="mb-2">
          <label className="text-[10px] sm:text-xs text-neutral-600 flex justify-between mb-1">
            <span>Reverb</span>
            <span className="font-mono font-bold text-neutral-900 bg-neutral-100/60 px-1.5 py-0.5 rounded text-[10px]">{reverbMix}%</span>
          </label>
          <input
            type="range" min={0} max={100} value={reverbMix}
            onChange={(e) => onReverbChange(parseInt(e.target.value))}
            className="w-full h-2 bg-neutral-200/60 rounded-full appearance-none cursor-pointer slider"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] sm:text-[10px] text-neutral-500 flex justify-between mb-1">
              <span>Comp Thresh</span>
              <span className="font-mono">{compThreshold}dB</span>
            </label>
            <input
              type="range" min={-40} max={0} value={compThreshold}
              onChange={(e) => onCompThresholdChange(parseInt(e.target.value))}
              className="w-full h-1.5 bg-neutral-200/60 rounded-full appearance-none cursor-pointer slider"
            />
          </div>
          <div>
            <label className="text-[9px] sm:text-[10px] text-neutral-500 flex justify-between mb-1">
              <span>Comp Ratio</span>
              <span className="font-mono">{compRatio}:1</span>
            </label>
            <input
              type="range" min={1} max={20} value={compRatio}
              onChange={(e) => onCompRatioChange(parseInt(e.target.value))}
              className="w-full h-1.5 bg-neutral-200/60 rounded-full appearance-none cursor-pointer slider"
            />
          </div>
        </div>
      </div>

      {/* Per-Voice Tuning & Decay */}
      <div className="border-t border-neutral-200/40 pt-2">
        <span className="text-[9px] sm:text-[10px] text-neutral-500 font-medium uppercase tracking-wider block mb-2">Voice Shaping</span>
        <div className="space-y-1.5">
          {TRACKS.map(track => {
            const vp = voiceParams[track.id] || { tune: 0, decay: 1.0 };
            return (
              <div key={track.id} className="flex items-center gap-2">
                <span className="text-[9px] sm:text-[10px] text-neutral-600 font-medium w-12 truncate">{track.name}</span>
                <div className="flex-1 flex items-center gap-1">
                  <span className="text-[8px] text-neutral-400 w-6">Tune</span>
                  <input
                    type="range" min={-12} max={12} value={vp.tune}
                    onChange={(e) => onVoiceParamChange(track.id, 'tune', parseInt(e.target.value))}
                    className="flex-1 h-1 slider"
                    title={`Tune: ${vp.tune > 0 ? '+' : ''}${vp.tune} st`}
                  />
                  <span className="text-[8px] text-neutral-400 font-mono w-6 text-right">{vp.tune > 0 ? '+' : ''}{vp.tune}</span>
                </div>
                <div className="flex-1 flex items-center gap-1">
                  <span className="text-[8px] text-neutral-400 w-8">Decay</span>
                  <input
                    type="range" min={25} max={300} value={Math.round(vp.decay * 100)}
                    onChange={(e) => onVoiceParamChange(track.id, 'decay', parseInt(e.target.value) / 100)}
                    className="flex-1 h-1 slider"
                    title={`Decay: ${Math.round(vp.decay * 100)}%`}
                  />
                  <span className="text-[8px] text-neutral-400 font-mono w-6 text-right">{Math.round(vp.decay * 100)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[8px] sm:text-[10px] text-neutral-500 mt-2 bg-neutral-50/60 p-1.5 sm:p-2 rounded-lg">
        Master reverb, compressor, per-voice tuning & decay
      </p>
    </div>
  );
}
