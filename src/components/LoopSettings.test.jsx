import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LoopSettings from './LoopSettings';

describe('LoopSettings', () => {
  it('displays current bar count', () => {
    render(<LoopSettings bars={2} onBarsChange={vi.fn()} collapsed={false} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('calls onBarsChange when slider changes', () => {
    const onBarsChange = vi.fn();
    render(<LoopSettings bars={2} onBarsChange={onBarsChange} collapsed={false} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '4' } });
    expect(onBarsChange).toHaveBeenCalledWith(4);
  });

  it('slider has correct min/max', () => {
    render(<LoopSettings bars={2} onBarsChange={vi.fn()} collapsed={false} />);
    const slider = screen.getByRole('slider');
    expect(slider.min).toBe('1');
    expect(slider.max).toBe('4');
  });
});
