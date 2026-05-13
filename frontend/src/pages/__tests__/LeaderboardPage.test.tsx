import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockGet = vi.hoisted(() => vi.fn());

vi.mock('../../api/client', () => ({
  default: {
    get: mockGet,
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  },
}));

import LeaderboardPage from '../LeaderboardPage';

function renderLeaderboardPage() {
  return render(
    <MemoryRouter>
      <LeaderboardPage />
    </MemoryRouter>,
  );
}

describe('LeaderboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    // Don't resolve the promise yet so loading stays
    mockGet.mockReturnValue(new Promise(() => {}));

    renderLeaderboardPage();
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('displays leaderboard entries after successful fetch', async () => {
    const entries = [
      { rank: 1, username: 'alice', highest_score: 1000, level: 5 },
      { rank: 2, username: 'bob', highest_score: 800, level: 4 },
    ];
    mockGet.mockResolvedValueOnce({ data: entries });

    renderLeaderboardPage();

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeTruthy();
    });

    expect(screen.getByText('bob')).toBeTruthy();
    expect(screen.getByText('1000')).toBeTruthy();
    expect(screen.getByText('800')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('displays error message when fetch fails', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));

    renderLeaderboardPage();

    await waitFor(() => {
      expect(screen.getByText('Failed to load leaderboard')).toBeTruthy();
    });
  });

  it('displays empty state when no entries exist', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });

    renderLeaderboardPage();

    await waitFor(() => {
      expect(screen.getByText('No entries yet.')).toBeTruthy();
    });
  });

  it('renders table headers for leaderboard', async () => {
    const entries = [
      { rank: 1, username: 'alice', highest_score: 1000, level: 5 },
    ];
    mockGet.mockResolvedValueOnce({ data: entries });

    renderLeaderboardPage();

    await waitFor(() => {
      expect(screen.getByText('Rank')).toBeTruthy();
    });

    expect(screen.getByText('Username')).toBeTruthy();
    expect(screen.getByText('Highest Score')).toBeTruthy();
    expect(screen.getByText('Level')).toBeTruthy();
  });
});
