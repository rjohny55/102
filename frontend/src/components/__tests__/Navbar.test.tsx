import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock control: track whether useAuth returns a logged-in user or not
let mockIsLoggedIn = true;
const mockLogout = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => {
    if (mockIsLoggedIn) {
      return {
        user: { id: 1, username: 'testuser' },
        token: 'test-token',
        loading: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: mockLogout,
      };
    }
    return {
      user: null,
      token: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    };
  },
}));

import Navbar from '../Navbar';

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  );
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoggedIn = true;
  });

  it('renders nav links (Game, Leaderboard)', () => {
    renderNavbar();
    // "Game" appears twice: brand link and nav link
    const gameLinks = screen.getAllByText('Game');
    expect(gameLinks.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Leaderboard')).toBeTruthy();
  });

  it('displays the username when user is logged in', () => {
    renderNavbar();
    expect(screen.getByText('testuser')).toBeTruthy();
  });

  it('shows a Logout button when user is logged in', () => {
    renderNavbar();
    const logoutBtn = screen.getByText('Logout');
    expect(logoutBtn).toBeTruthy();
  });

  it('calls logout when Logout button is clicked', () => {
    renderNavbar();
    const logoutBtn = screen.getByText('Logout');
    fireEvent.click(logoutBtn);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});

describe('Navbar when logged out', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoggedIn = false;
  });

  it('shows Login and Register links when user is not logged in', () => {
    renderNavbar();
    expect(screen.getByText('Login')).toBeTruthy();
    expect(screen.getByText('Register')).toBeTruthy();
  });

  it('does not show Logout button when user is not logged in', () => {
    renderNavbar();
    expect(screen.queryByText('Logout')).toBeNull();
  });

  it('does not show username when user is not logged in', () => {
    renderNavbar();
    expect(screen.queryByText('testuser')).toBeNull();
  });
});
