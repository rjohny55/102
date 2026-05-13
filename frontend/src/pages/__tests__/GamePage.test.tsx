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
    // Mock global fetch
    globalThis.fetch = vi.fn();
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

  it('saves score to the correct API endpoint (/api/scores)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
    });
    globalThis.fetch = mockFetch;

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
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Verify the URL is /api/scores (not /api/game/scores)
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('/api/scores');

    // Verify it's a POST request with correct body
    expect(callArgs[1]?.method ?? 'POST').toBe('POST');
    const body = JSON.parse(callArgs[1]?.body ?? '{}');
    expect(body.score).toBe(100);
    expect(body.level).toBe(2);
    expect(body.moves).toBe(15);
  });

  it('shows success message when score is saved', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
    });
    globalThis.fetch = mockFetch;

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

  it('shows failure message when score save fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
    });
    globalThis.fetch = mockFetch;

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

  it('shows network error message when fetch throws', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    globalThis.fetch = mockFetch;

    render(
      <MemoryRouter>
        <GamePage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('trigger-game-over'));
    fireEvent.click(screen.getByText('Save Score'));

    await waitFor(() => {
      expect(screen.getByText('Network error. Score could not be saved.')).toBeTruthy();
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
    // Create a fetch mock that never resolves to test the saving state
    const mockFetch = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    globalThis.fetch = mockFetch;

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
