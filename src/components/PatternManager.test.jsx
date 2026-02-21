import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PatternManager from './PatternManager';

describe('PatternManager', () => {
  const defaultProps = {
    onSave: vi.fn(),
    onLoad: vi.fn(),
    onShare: vi.fn(() => 'http://test.com/#encoded'),
    onExport: vi.fn(() => Promise.resolve()),
    collapsed: false,
  };

  it('renders Save, Load, Share URL, Export WAV buttons', () => {
    render(<PatternManager {...defaultProps} />);
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Load')).toBeInTheDocument();
    expect(screen.getByText('Share URL')).toBeInTheDocument();
    expect(screen.getByText('Export WAV')).toBeInTheDocument();
  });

  it('shows slot grid when Save is clicked', () => {
    render(<PatternManager {...defaultProps} />);
    fireEvent.click(screen.getByText('Save'));
    expect(screen.getByText('Save to slot')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows slot grid when Load is clicked', () => {
    render(<PatternManager {...defaultProps} />);
    fireEvent.click(screen.getByText('Load'));
    expect(screen.getByText('Load from slot')).toBeInTheDocument();
  });

  it('renders 8 slot buttons', () => {
    render(<PatternManager {...defaultProps} />);
    fireEvent.click(screen.getByText('Save'));
    // Slot numbers 1-8
    for (let i = 1; i <= 8; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it('Cancel hides slot grid', () => {
    render(<PatternManager {...defaultProps} />);
    fireEvent.click(screen.getByText('Save'));
    expect(screen.getByText('Save to slot')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Save to slot')).not.toBeInTheDocument();
  });

  it('shows description text when slots not shown', () => {
    render(<PatternManager {...defaultProps} />);
    expect(screen.getByText(/8 save slots/)).toBeInTheDocument();
  });

  it('calls onSave when a slot is clicked in save mode', () => {
    const onSave = vi.fn();
    render(<PatternManager {...defaultProps} onSave={onSave} />);
    fireEvent.click(screen.getByText('Save'));
    // Click slot 1
    fireEvent.click(screen.getByText('1'));
    expect(onSave).toHaveBeenCalledWith(0, expect.any(String));
  });

  it('calls onLoad when a saved slot is clicked in load mode', () => {
    // Pre-populate localStorage with a saved slot
    const slotData = {
      name: 'Test',
      timestamp: Date.now(),
      data: { patterns: {}, bpm: 100, swing: 0, bars: 2 },
    };
    const slots = Array(8).fill(null);
    slots[0] = slotData;
    localStorage.setItem('drumcomputer_slots', JSON.stringify(slots));

    const onLoad = vi.fn();
    render(<PatternManager {...defaultProps} onLoad={onLoad} />);
    fireEvent.click(screen.getByText('Load'));
    fireEvent.click(screen.getByText('1'));
    expect(onLoad).toHaveBeenCalled();
  });

  it('shows "Empty slot" feedback for empty slot in load mode', async () => {
    render(<PatternManager {...defaultProps} />);
    fireEvent.click(screen.getByText('Load'));
    fireEvent.click(screen.getByText('1'));
    expect(screen.getByText('Empty slot')).toBeInTheDocument();
  });

  it('Export WAV calls onExport', async () => {
    const onExport = vi.fn(() => Promise.resolve());
    render(<PatternManager {...defaultProps} onExport={onExport} />);
    fireEvent.click(screen.getByText('Export WAV'));
    expect(onExport).toHaveBeenCalled();
  });
});
