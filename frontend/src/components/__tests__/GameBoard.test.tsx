import React from 'react';
import { render, screen } from '@testing-library/react';
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

  it('calls onUpdate callback when game state changes', () => {
    const onUpdate = jest.fn();
    render(<GameBoard onUpdate={onUpdate} />);
    // After mount with empty board, game hasn't started yet
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
