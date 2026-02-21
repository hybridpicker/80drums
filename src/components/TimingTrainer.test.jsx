import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TimingTrainer from './TimingTrainer';
import { TRAINER_PRESETS } from '../utils/patternHelpers';

describe('TimingTrainer', () => {
  const defaultProps = {
    trainerMode: null,
    customPlay: 3,
    customSilence: 1,
    fadePhase: 0,
    onToggleMode: vi.fn(),
    onCustomPlayChange: vi.fn(),
    onCustomSilenceChange: vi.fn(),
    statusBadge: { text: 'Aus', inSilence: false },
    collapsed: false,
  };

  it('renders all 6 preset buttons', () => {
    render(<TimingTrainer {...defaultProps} />);
    Object.values(TRAINER_PRESETS).forEach(preset => {
      expect(screen.getByText(preset.label)).toBeInTheDocument();
    });
  });

  it('calls onToggleMode when button is clicked', () => {
    const onToggleMode = vi.fn();
    render(<TimingTrainer {...defaultProps} onToggleMode={onToggleMode} />);
    fireEvent.click(screen.getByText('Call & Response'));
    expect(onToggleMode).toHaveBeenCalledWith('callResponse');
  });

  it('shows description when mode is active', () => {
    render(<TimingTrainer {...defaultProps} trainerMode="callResponse" />);
    expect(screen.getByText(TRAINER_PRESETS.callResponse.desc)).toBeInTheDocument();
  });

  it('shows default description when no mode active', () => {
    render(<TimingTrainer {...defaultProps} />);
    expect(screen.getByText(/Timing-Training/)).toBeInTheDocument();
  });

  it('shows custom sliders only in custom mode', () => {
    const { rerender } = render(<TimingTrainer {...defaultProps} />);
    expect(screen.queryByText(/Play:.*Bars/)).not.toBeInTheDocument();

    rerender(<TimingTrainer {...defaultProps} trainerMode="custom" />);
    expect(screen.getByText(/Play:/)).toBeInTheDocument();
    expect(screen.getByText(/Silence:/)).toBeInTheDocument();
  });

  it('shows fade phase indicator in fadeAway mode', () => {
    render(<TimingTrainer {...defaultProps} trainerMode="fadeAway" fadePhase={2} />);
    expect(screen.getByText('Phase:')).toBeInTheDocument();
  });
});
