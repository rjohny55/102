import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Create mock functions that survive hoisting
const mockPost = vi.hoisted(() => vi.fn());

vi.mock('../../api/client', () => ({
  default: {
    post: mockPost,
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  },
}));

import { AuthProvider, useAuth } from '../AuthContext';

// Test helper component that uses the auth context
function TestConsumer() {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="loading">{auth.loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{auth.user ? auth.user.username : 'no-user'}</div>
      <div data-testid="token">{auth.token || 'no-token'}</div>
      <button data-testid="login-btn" onClick={() => auth.login('testuser', 'password123')}>
        Login
      </button>
      <button data-testid="register-btn" onClick={() => auth.register('newuser', 'password123')}>
        Register
      </button>
      <button data-testid="logout-btn" onClick={() => auth.logout()}>
        Logout
      </button>
    </div>
  );
}

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  );
}

describe('AuthContext Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('starts with no user and no token when no stored session', async () => {
    renderWithRouter(<TestConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading');
    });

    expect(screen.getByTestId('user').textContent).toBe('no-user');
    expect(screen.getByTestId('token').textContent).toBe('no-token');
  });

  it('restores session from localStorage on mount', async () => {
    localStorage.setItem('token', 'stored-token');
    localStorage.setItem('user', JSON.stringify({ id: 1, username: 'storeduser' }));

    renderWithRouter(<TestConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading');
    });

    expect(screen.getByTestId('user').textContent).toBe('storeduser');
    expect(screen.getByTestId('token').textContent).toBe('stored-token');
  });

  it('handles login via API and stores the token', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        access_token: 'login-token-123',
        user: { id: 1, username: 'testuser' },
      },
    });

    renderWithRouter(<TestConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading');
    });

    // Click login button
    screen.getByTestId('login-btn').click();

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/auth/login', {
        username: 'testuser',
        password: 'password123',
      });
    });

    expect(localStorage.getItem('token')).toBe('login-token-123');
    expect(localStorage.getItem('user')).toBe(
      JSON.stringify({ id: 1, username: 'testuser' }),
    );
  });

  it('handles register via API and stores the token', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        access_token: 'register-token-456',
        user: { id: 2, username: 'newuser' },
      },
    });

    renderWithRouter(<TestConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading');
    });

    screen.getByTestId('register-btn').click();

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/auth/register', {
        username: 'newuser',
        password: 'password123',
      });
    });

    expect(localStorage.getItem('token')).toBe('register-token-456');
    expect(localStorage.getItem('user')).toBe(
      JSON.stringify({ id: 2, username: 'newuser' }),
    );
  });

  it('handles logout by clearing state and localStorage', async () => {
    localStorage.setItem('token', 'some-token');
    localStorage.setItem('user', JSON.stringify({ id: 1, username: 'testuser' }));

    renderWithRouter(<TestConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('not-loading');
    });

    screen.getByTestId('logout-btn').click();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('throws error when useAuth is used outside provider', () => {
    // Suppress console.error for this expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(
        <MemoryRouter>
          <TestConsumer />
        </MemoryRouter>,
      );
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
