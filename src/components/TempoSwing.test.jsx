import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TempoSwing from './TempoSwing';

describe('TempoSwing', () => {
  it('displays current BPM', () => {
    render(<TempoSwing bpm={120} swing={15} onBpmChange={vi.fn()} onSwingChange={vi.fn()} collapsed={false} />);
    expect(screen.getByText('120 BPM')).toBeInTheDocument();
  });

  it('displays current swing percentage', () => {
    render(<TempoSwing bpm={120} swing={15} onBpmChange={vi.fn()} onSwingChange={vi.fn()} collapsed={false} />);
    expect(screen.getByText('15%')).toBeInTheDocument();
  });

  it('calls onBpmChange when BPM slider changes', () => {
    const onBpmChange = vi.fn();
    render(<TempoSwing bpm={120} swing={0} onBpmChange={onBpmChange} onSwingChange={vi.fn()} collapsed={false} />);
    const sliders = screen.getAllByRole('slider');
    // BPM slider is the first one
    fireEvent.change(sliders[0], { target: { value: '140' } });
    expect(onBpmChange).toHaveBeenCalledWith(140);
  });

  it('calls onSwingChange when Swing slider changes', () => {
    const onSwingChange = vi.fn();
    render(<TempoSwing bpm={120} swing={0} onBpmChange={vi.fn()} onSwingChange={onSwingChange} collapsed={false} />);
    const sliders = screen.getAllByRole('slider');
    // Swing slider is the second one
    fireEvent.change(sliders[1], { target: { value: '30' } });
    expect(onSwingChange).toHaveBeenCalledWith(30);
  });
});
