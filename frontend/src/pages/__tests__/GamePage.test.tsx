import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// Mock the AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'testuser' },
    token: 'test-token',
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Mock the API client (axios-based) — the production code now uses client.post()
const mockClientPost = vi.hoisted(() => vi.fn());
vi.mock('../../api/client', () => ({
  default: {
    post: mockClientPost,
  },
}));

// Mock GameBoard to trigger onGameOver with test values
vi.mock('../../components/GameBoard', () => ({
  default: ({ onGameOver, onUpdate }: { onGameOver: (score: number, level: number, moves: number) => void; onUpdate: (...args: unknown[]) => void }) => {
    // Call onUpdate on mount to simulate normal behavior
    React.useEffect(() => {
      onUpdate(0, 1, 60);
    }, [onUpdate]);

    return (
      <div data-testid="mock-game-board">
        <button
          data-testid="trigger-game-over"
          onClick={() => onGameOver(100, 2, 15)}
        >
          Trigger Game Over
        </button>
      </div>
    );
  },
}));

import GamePage from '../GamePage';

describe('GamePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <GamePage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Match-3')).toBeTruthy();
    expect(screen.getByText('Welcome, testuser!')).toBeTruthy();
  });

  it('shows HUD with initial values', () => {
    render(
      <MemoryRouter>
        <GamePage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Score')).toBeTruthy();
    expect(screen.getByText('Level')).toBeTruthy();
    expect(screen.getByText('Time')).toBeTruthy();
  });

  it('displays game result overlay when game is over', () => {
    render(
      <MemoryRouter>
        <GamePage />
      </MemoryRouter>,
    );

    // Trigger game over via the mock GameBoard
    fireEvent.click(screen.getByTestId('trigger-game-over'));

    expect(screen.getByText('Final Score: 100')).toBeTruthy();
    expect(screen.getByText('Level reached: 2')).toBeTruthy();
    expect(screen.getByText('Total moves: 15')).toBeTruthy();
    expect(screen.getByText('Save Score')).toBeTruthy();
    expect(screen.getByText('Play Again')).toBeTruthy();
  });

  it('saves score via client.post with correct endpoint and body', async () => {
    mockClientPost.mockResolvedValue({ data: { id: 1 } });

    render(
      <MemoryRouter>
        <GamePage />
      </MemoryRouter>,
    );

    // Trigger game over
    fireEvent.click(screen.getByTestId('trigger-game-over'));

    // Click Save Score
    fireEvent.click(screen.getByText('Save Score'));

    await waitFor(() => {
      expect(mockClientPost).toHaveBeenCalledTimes(1);
    });

    // Verify client.post was called with the correct URL and body
    expect(mockClientPost).toHaveBeenCalledWith('/api/scores', {
      score: 100,
      level: 2,
      moves: 15,
    });
  });

  it('shows success message when score is saved successfully', async () => {
    mockClientPost.mockResolvedValue({ data: { id: 1 } });

    render(
      <MemoryRouter>
        <GamePage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('trigger-game-over'));
    fireEvent.click(screen.getByText('Save Score'));

    await waitFor(() => {
      expect(screen.getByText('Score saved successfully!')).toBeTruthy();
    });
  });

  it('shows failure message when client.post rejects', async () => {
    mockClientPost.mockRejectedValue(new Error('Request failed'));

    render(
      <MemoryRouter>
        <GamePage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('trigger-game-over'));
    fireEvent.click(screen.getByText('Save Score'));

    await waitFor(() => {
      expect(screen.getByText('Failed to save score. Please try again.')).toBeTruthy();
    });
  });

  it('handles Play Again to reset game state', () => {
    render(
      <MemoryRouter>
        <GamePage />
      </MemoryRouter>,
    );

    // Trigger game over
    fireEvent.click(screen.getByTestId('trigger-game-over'));
    expect(screen.getByText('Final Score: 100')).toBeTruthy();

    // Click Play Again
    fireEvent.click(screen.getByText('Play Again'));

    // Game result overlay should be gone
    expect(screen.queryByText('Final Score: 100')).toBeNull();
    // HUD should be reset
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('shows Save Score button as disabled while saving', async () => {
    // Create a mock that never resolves to test the saving state
    mockClientPost.mockReturnValue(new Promise(() => {})); // never resolves

    render(
      <MemoryRouter>
        <GamePage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('trigger-game-over'));

    const saveButton = screen.getByText('Save Score');
    fireEvent.click(saveButton);

    // Button should show "Saving..." and be disabled
    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeTruthy();
    });
  });
});
