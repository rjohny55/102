import { describe, it, expect, vi, beforeEach } from 'vitest';

// Track interceptor registrations via exported registry
const interceptorCalls = vi.hoisted(() => ({
  request: { fulfilled: null as unknown, rejected: null as unknown },
  response: { fulfilled: null as unknown, rejected: null as unknown },
}));

vi.mock('axios', () => {
  const mockInstance = {
    interceptors: {
      request: {
        use: (fulfilled: unknown, rejected: unknown) => {
          interceptorCalls.request.fulfilled = fulfilled;
          interceptorCalls.request.rejected = rejected;
        },
      },
      response: {
        use: (fulfilled: unknown, rejected: unknown) => {
          interceptorCalls.response.fulfilled = fulfilled;
          interceptorCalls.response.rejected = rejected;
        },
      },
    },
    defaults: { headers: { common: {} } },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  return {
    default: {
      create: vi.fn(() => mockInstance),
    },
    AxiosError: class AxiosError extends Error {
      constructor(
        message: string,
        public config?: unknown,
        public code?: string,
        public response?: unknown,
      ) {
        super(message);
        this.name = 'AxiosError';
      }
    },
  };
});

import client from '../client';

describe('API Client Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('imports the client module correctly', () => {
    expect(client).toBeDefined();
    expect(client.interceptors).toBeDefined();
    expect(client.get).toBeDefined();
    expect(client.post).toBeDefined();
  });

  it('registers request and response interceptors', () => {
    expect(interceptorCalls.request.fulfilled).toBeDefined();
    expect(interceptorCalls.request.rejected).toBeDefined();
    expect(interceptorCalls.response.fulfilled).toBeDefined();
    expect(interceptorCalls.response.rejected).toBeDefined();
  });

  it('attaches auth token from localStorage as Bearer header on requests', () => {
    localStorage.setItem('token', 'test-jwt-token');

    const fulfilledFn = interceptorCalls.request.fulfilled as (config: any) => any;
    const config = { headers: { 'Content-Type': 'application/json' } };
    const result = fulfilledFn(config);

    expect(result.headers.Authorization).toBe('Bearer test-jwt-token');
  });

  it('does not attach auth header when no token in localStorage', () => {
    const fulfilledFn = interceptorCalls.request.fulfilled as (config: any) => any;
    const config = { headers: { 'Content-Type': 'application/json' } };
    const result = fulfilledFn(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it('handles 401 responses by clearing localStorage and redirecting', async () => {
    const rejectedFn = interceptorCalls.response.rejected as (error: any) => any;

    localStorage.setItem('token', 'expired-token');
    localStorage.setItem('user', '{"id":1,"username":"test"}');

    const originalLocation = window.location;
    delete (window as any).location;
    (window as any).location = { href: '' };

    const error = { response: { status: 401 }, config: {} };

    await expect(rejectedFn(error)).rejects.toEqual(error);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect((window as any).location.href).toBe('/login');

    (window as any).location = originalLocation;
  });

  it('re-throws non-401 errors without clearing storage', async () => {
    const rejectedFn = interceptorCalls.response.rejected as (error: any) => any;
    localStorage.setItem('token', 'some-token');

    const error = { response: { status: 500 }, config: {} };

    await expect(rejectedFn(error)).rejects.toEqual(error);
    expect(localStorage.getItem('token')).toBe('some-token');
  });
});
