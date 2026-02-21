import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Create stable mock objects OUTSIDE the factory to prevent infinite re-renders
const mockScheduler = {
  isPlaying: false,
  uiStep: 0,
  handleStart: vi.fn(),
  handleStop: vi.fn(),
  handleToggle: vi.fn(),
  scheduleIfSoon: vi.fn(),
  bpmRef: { current: 100 },
  swingRef: { current: 0 },
  barsRef: { current: 2 },
  setBpm: vi.fn(),
  setSwing: vi.fn(),
  setBarsRef: vi.fn(),
  currentStepRef: { current: 0 },
};

vi.mock('../hooks/useScheduler', () => ({
  default: () => mockScheduler,
}));

// Dynamic import after mock is set up
const { default: Drumcomputer } = await import('./Drumcomputer');

describe('Drumcomputer (smoke test)', () => {
  it('renders without crashing', () => {
    render(<Drumcomputer />);
  });

  it('shows header title', () => {
    render(<Drumcomputer />);
    expect(screen.getByText('Drumcomputer')).toBeInTheDocument();
  });

  it('shows Start button', () => {
    render(<Drumcomputer />);
    expect(screen.getByRole('button', { name: /Start/ })).toBeInTheDocument();
  });

  it('renders all 8 track names', () => {
    render(<Drumcomputer />);
    ['Kick', 'Snare', 'Hi-Hat', 'Open Hat', 'Clap', 'Cymbal', 'Tom', 'Rimshot'].forEach(name => {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    });
  });
});
