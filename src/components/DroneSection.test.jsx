import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DroneSection from './DroneSection';

describe('DroneSection', () => {
  const defaultProps = {
    droneEnabled: false,
    droneNote: 33,
    onToggle: vi.fn(),
    onNoteChange: vi.fn(),
    collapsed: false,
  };

  it('renders Enable Drone checkbox', () => {
    render(<DroneSection {...defaultProps} />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('checkbox reflects droneEnabled state', () => {
    render(<DroneSection {...defaultProps} droneEnabled={true} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('calls onToggle when checkbox changes', () => {
    const onToggle = vi.fn();
    render(<DroneSection {...defaultProps} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('displays note name and frequency', () => {
    render(<DroneSection {...defaultProps} droneEnabled={true} droneNote={33} />);
    // A1 at 55 Hz — appears in label and in quick-select buttons
    expect(screen.getAllByText(/A1/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/55\.0/)).toBeInTheDocument();
  });

  it('renders 6 quick-select note buttons', () => {
    render(<DroneSection {...defaultProps} droneEnabled={true} />);
    // Quick-select buttons are actual <button> elements
    const buttons = screen.getAllByRole('button');
    const quickLabels = ['A1', 'C2', 'E2', 'G2', 'A2', 'C3'];
    quickLabels.forEach(note => {
      expect(buttons.some(b => b.textContent === note)).toBe(true);
    });
  });

  it('calls onNoteChange when quick-select is clicked', () => {
    const onNoteChange = vi.fn();
    render(<DroneSection {...defaultProps} droneEnabled={true} onNoteChange={onNoteChange} />);
    fireEvent.click(screen.getByText('C2'));
    expect(onNoteChange).toHaveBeenCalledWith(36);
  });

  it('note slider is disabled when drone is off', () => {
    render(<DroneSection {...defaultProps} droneEnabled={false} />);
    const slider = screen.getByRole('slider');
    expect(slider).toBeDisabled();
  });
});
