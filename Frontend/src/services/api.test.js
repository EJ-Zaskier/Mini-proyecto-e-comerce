vi.mock('axios', () => {
  const apiInstance = {
    interceptors: {
      request: {
        use: vi.fn((interceptor) => {
          apiInstance.requestInterceptor = interceptor;
        })
      }
    }
  };

  const create = vi.fn(() => apiInstance);

  return {
    __esModule: true,
    default: { create },
    create
  };
});

import api from '../services/api';

describe('api request interceptor', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  test('adds Bearer token when token exists in session storage', async () => {
    const interceptor = api.requestInterceptor;

    sessionStorage.setItem('token', 'abc123');
    const config = await interceptor({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer abc123');
  });

  test('keeps request without Authorization when token is missing', async () => {
    const interceptor = api.requestInterceptor;
    const config = await interceptor({ headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });
});
