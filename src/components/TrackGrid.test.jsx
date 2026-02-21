import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TrackGrid from './TrackGrid';
import { emptyPattern, seed } from '../utils/patternHelpers';

describe('TrackGrid', () => {
  const defaultProps = {
    trackId: 'kick',
    name: 'Kick',
    pattern: seed([0, 8], 1),
    colorClass: 'bg-emerald-500',
    playhead: -1,
    isPlaying: false,
    isMobileDevice: false,
    bars: 1,
    activeMobileBar: 0,
    setActiveMobileBar: vi.fn(),
    onToggleStep: vi.fn(),
    volume: 100,
    mute: false,
    solo: false,
    onVolumeChange: vi.fn(),
    onMuteToggle: vi.fn(),
    onSoloToggle: vi.fn(),
    isDragging: false,
    onDragStart: vi.fn(),
    onDragEnter: vi.fn(),
    darkMode: false,
  };

  it('renders track name', () => {
    render(<TrackGrid {...defaultProps} />);
    expect(screen.getByText('Kick')).toBeInTheDocument();
  });

  it('renders 16 step buttons for 1 bar', () => {
    render(<TrackGrid {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // 16 step buttons + M button + S button = 18
    const stepButtons = buttons.filter(b => b.getAttribute('aria-label')?.includes('step'));
    expect(stepButtons).toHaveLength(16);
  });

  it('shows active step count', () => {
    render(<TrackGrid {...defaultProps} />);
    expect(screen.getByText('2/16')).toBeInTheDocument();
  });

  it('calls onToggleStep on step click', () => {
    const onToggleStep = vi.fn();
    render(<TrackGrid {...defaultProps} onToggleStep={onToggleStep} />);
    const step = screen.getByLabelText('Kick step 1 active');
    fireEvent.mouseDown(step);
    expect(onToggleStep).toHaveBeenCalledWith('kick', 0);
  });

  it('renders Mute and Solo buttons', () => {
    render(<TrackGrid {...defaultProps} />);
    expect(screen.getByTitle('Mute')).toBeInTheDocument();
    expect(screen.getByTitle('Solo')).toBeInTheDocument();
  });

  it('calls onMuteToggle when M is clicked', () => {
    const onMuteToggle = vi.fn();
    render(<TrackGrid {...defaultProps} onMuteToggle={onMuteToggle} />);
    fireEvent.click(screen.getByTitle('Mute'));
    expect(onMuteToggle).toHaveBeenCalledWith('kick');
  });

  it('calls onSoloToggle when S is clicked', () => {
    const onSoloToggle = vi.fn();
    render(<TrackGrid {...defaultProps} onSoloToggle={onSoloToggle} />);
    fireEvent.click(screen.getByTitle('Solo'));
    expect(onSoloToggle).toHaveBeenCalledWith('kick');
  });

  it('shows volume slider', () => {
    render(<TrackGrid {...defaultProps} />);
    const slider = screen.getByTitle('Volume: 100%');
    expect(slider).toBeInTheDocument();
  });

  it('applies muted opacity', () => {
    render(<TrackGrid {...defaultProps} mute={true} />);
    const gridContainer = document.querySelector('.opacity-40');
    expect(gridContainer).toBeInTheDocument();
  });

  it('calls onVolumeChange when volume slider changes', () => {
    const onVolumeChange = vi.fn();
    render(<TrackGrid {...defaultProps} onVolumeChange={onVolumeChange} />);
    const slider = screen.getByTitle('Volume: 100%');
    fireEvent.change(slider, { target: { value: '50' } });
    expect(onVolumeChange).toHaveBeenCalledWith('kick', 50);
  });

  it('renders 32 steps for 2 bars (desktop)', () => {
    const pattern = seed([0, 8], 2);
    render(<TrackGrid {...defaultProps} pattern={pattern} bars={2} />);
    const stepButtons = screen.getAllByRole('button').filter(b =>
      b.getAttribute('aria-label')?.includes('step')
    );
    expect(stepButtons).toHaveLength(32);
  });

  it('shows accent aria-label for accented step', () => {
    const pattern = emptyPattern(1);
    pattern[0] = 2; // accent
    render(<TrackGrid {...defaultProps} pattern={pattern} />);
    expect(screen.getByLabelText('Kick step 1 accent')).toBeInTheDocument();
  });

  it('shows inactive aria-label for empty step', () => {
    render(<TrackGrid {...defaultProps} />);
    expect(screen.getByLabelText('Kick step 2 inactive')).toBeInTheDocument();
  });

  it('highlights playhead step', () => {
    render(<TrackGrid {...defaultProps} isPlaying={true} playhead={0} />);
    // The playhead step should have the ring-yellow class
    const step = screen.getByLabelText('Kick step 1 active');
    expect(step.className).toContain('ring-yellow');
  });

  it('shows Copy button on desktop', () => {
    render(<TrackGrid {...defaultProps} onCopy={vi.fn()} />);
    expect(screen.getByTitle('Copy track')).toBeInTheDocument();
  });

  it('shows Paste button when clipboard has data', () => {
    render(<TrackGrid {...defaultProps} onPaste={vi.fn()} hasClipboard={true} />);
    expect(screen.getByTitle('Paste track')).toBeInTheDocument();
  });

  it('calls onCopy when C button clicked', () => {
    const onCopy = vi.fn();
    render(<TrackGrid {...defaultProps} onCopy={onCopy} />);
    fireEvent.click(screen.getByTitle('Copy track'));
    expect(onCopy).toHaveBeenCalledWith('kick');
  });

  it('calls onPaste when P button clicked', () => {
    const onPaste = vi.fn();
    render(<TrackGrid {...defaultProps} onPaste={onPaste} hasClipboard={true} />);
    fireEvent.click(screen.getByTitle('Paste track'));
    expect(onPaste).toHaveBeenCalledWith('kick');
  });
});
