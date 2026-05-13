import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockRegister = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    loading: false,
    login: vi.fn(),
    register: mockRegister,
    logout: vi.fn(),
  }),
}));

import RegisterPage from '../RegisterPage';

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the registration form', () => {
    renderRegisterPage();
    // "Register" appears in both h1 heading and button
    const registerElements = screen.getAllByText('Register');
    expect(registerElements.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Username')).toBeTruthy();
    expect(screen.getByText('Password')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Register' })).toBeTruthy();
  });

  it('has a link to the login page', () => {
    renderRegisterPage();
    const loginLink = screen.getByText('Already have an account?');
    expect(loginLink).toBeTruthy();
  });

  it('submits username and password on form submit', async () => {
    mockRegister.mockResolvedValueOnce(undefined);

    renderRegisterPage();

    const usernameInput = screen.getByRole('textbox', { name: /username/i });
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: 'Register' });

    fireEvent.change(usernameInput, { target: { value: 'newuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('newuser', 'password123');
    });
  });

  it('displays an error message when registration fails with axios error detail', async () => {
    mockRegister.mockRejectedValueOnce({
      response: { data: { detail: 'Username already taken' } },
    });

    renderRegisterPage();

    const usernameInput = screen.getByRole('textbox', { name: /username/i });
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: 'Register' });

    fireEvent.change(usernameInput, { target: { value: 'existinguser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Username already taken')).toBeTruthy();
    });
  });

  it('displays a generic error message when registration fails without detail', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Network error'));

    renderRegisterPage();

    const usernameInput = screen.getByRole('textbox', { name: /username/i });
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: 'Register' });

    fireEvent.change(usernameInput, { target: { value: 'newuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Registration failed')).toBeTruthy();
    });
  });

  it('displays a generic error for non-axios errors', async () => {
    mockRegister.mockRejectedValueOnce('string error');

    renderRegisterPage();

    const usernameInput = screen.getByRole('textbox', { name: /username/i });
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: 'Register' });

    fireEvent.change(usernameInput, { target: { value: 'newuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Registration failed')).toBeTruthy();
    });
  });
});
