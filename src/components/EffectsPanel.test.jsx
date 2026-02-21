import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EffectsPanel from './EffectsPanel';
import { TRACKS } from '../utils/patternHelpers';

describe('EffectsPanel', () => {
  function makeVoiceParams() {
    const vp = {};
    TRACKS.forEach(t => { vp[t.id] = { tune: 0, decay: 1.0 }; });
    return vp;
  }

  const defaultProps = {
    reverbMix: 30,
    onReverbChange: vi.fn(),
    compThreshold: -12,
    compRatio: 4,
    onCompThresholdChange: vi.fn(),
    onCompRatioChange: vi.fn(),
    voiceParams: makeVoiceParams(),
    onVoiceParamChange: vi.fn(),
    collapsed: false,
  };

  it('displays reverb percentage', () => {
    render(<EffectsPanel {...defaultProps} />);
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('displays compressor threshold', () => {
    render(<EffectsPanel {...defaultProps} />);
    expect(screen.getByText('-12dB')).toBeInTheDocument();
  });

  it('displays compressor ratio', () => {
    render(<EffectsPanel {...defaultProps} />);
    expect(screen.getByText('4:1')).toBeInTheDocument();
  });

  it('renders voice shaping section with all track names', () => {
    render(<EffectsPanel {...defaultProps} />);
    expect(screen.getByText('Voice Shaping')).toBeInTheDocument();
    TRACKS.forEach(t => {
      expect(screen.getByText(t.name)).toBeInTheDocument();
    });
  });

  it('calls onReverbChange when reverb slider changes', () => {
    const onReverbChange = vi.fn();
    render(<EffectsPanel {...defaultProps} onReverbChange={onReverbChange} />);
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '60' } });
    expect(onReverbChange).toHaveBeenCalledWith(60);
  });

  it('calls onCompThresholdChange', () => {
    const onCompThresholdChange = vi.fn();
    render(<EffectsPanel {...defaultProps} onCompThresholdChange={onCompThresholdChange} />);
    const sliders = screen.getAllByRole('slider');
    // Comp thresh is the second slider
    fireEvent.change(sliders[1], { target: { value: '-20' } });
    expect(onCompThresholdChange).toHaveBeenCalledWith(-20);
  });

  it('calls onCompRatioChange', () => {
    const onCompRatioChange = vi.fn();
    render(<EffectsPanel {...defaultProps} onCompRatioChange={onCompRatioChange} />);
    const sliders = screen.getAllByRole('slider');
    // Comp ratio is the third slider
    fireEvent.change(sliders[2], { target: { value: '8' } });
    expect(onCompRatioChange).toHaveBeenCalledWith(8);
  });

  it('calls onVoiceParamChange when tune slider changes', () => {
    const onVoiceParamChange = vi.fn();
    render(<EffectsPanel {...defaultProps} onVoiceParamChange={onVoiceParamChange} />);
    const sliders = screen.getAllByRole('slider');
    // After the 3 master sliders, voice sliders start (tune/decay pairs for each track)
    // First track tune slider is at index 3
    fireEvent.change(sliders[3], { target: { value: '5' } });
    expect(onVoiceParamChange).toHaveBeenCalledWith('kick', 'tune', 5);
  });

  it('calls onVoiceParamChange when decay slider changes', () => {
    const onVoiceParamChange = vi.fn();
    render(<EffectsPanel {...defaultProps} onVoiceParamChange={onVoiceParamChange} />);
    const sliders = screen.getAllByRole('slider');
    // First track decay slider is at index 4
    fireEvent.change(sliders[4], { target: { value: '150' } });
    expect(onVoiceParamChange).toHaveBeenCalledWith('kick', 'decay', 1.5);
  });
});
