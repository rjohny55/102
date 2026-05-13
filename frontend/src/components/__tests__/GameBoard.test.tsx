import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GameBoard from '../GameBoard';

describe('GameBoard', () => {
  it('renders without crashing', () => {
    // Initially the board is empty, so it should show the Start button
    const { container } = render(<GameBoard />);
    expect(container).toBeTruthy();
  });

  it('shows a Start Game button when board is empty', () => {
    render(<GameBoard />);
    const startButton = screen.queryByText('Start Game');
    expect(startButton).not.toBeNull();
  });

  it('calls onUpdate callback on mount with initial values', () => {
    const onUpdate = vi.fn();
    render(<GameBoard onUpdate={onUpdate} />);
    // During mount, onUpdate fires once with initial state: score=0, level=1, timeLeft=60, isPlaying=false
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith(0, 1, 60, false);
  });
});
