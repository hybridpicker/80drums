import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GroovePresets from './GroovePresets';
import { presets } from '../utils/patternHelpers';

describe('GroovePresets', () => {
  const presetNames = Object.keys(presets);

  it('renders all 8 preset buttons', () => {
    render(<GroovePresets onLoadPreset={vi.fn()} onClear={vi.fn()} collapsed={false} />);
    presetNames.forEach(name => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it('renders Clear All button', () => {
    render(<GroovePresets onLoadPreset={vi.fn()} onClear={vi.fn()} collapsed={false} />);
    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('calls onLoadPreset with correct name', () => {
    const onLoadPreset = vi.fn();
    render(<GroovePresets onLoadPreset={onLoadPreset} onClear={vi.fn()} collapsed={false} />);
    fireEvent.click(screen.getByText('Classic 1'));
    expect(onLoadPreset).toHaveBeenCalledWith('Classic 1');
  });

  it('calls onClear when Clear All is clicked', () => {
    const onClear = vi.fn();
    render(<GroovePresets onLoadPreset={vi.fn()} onClear={onClear} collapsed={false} />);
    fireEvent.click(screen.getByText('Clear All'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
