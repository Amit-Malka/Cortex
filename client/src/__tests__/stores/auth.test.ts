import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// Mock the api module before importing the store
vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    defaults: { headers: { common: {} } },
    interceptors: {
      request: { use: vi.fn() },
    },
  },
}));

import api from '../../api/axios';
import { useAuthStore } from '../../stores/auth';

const mockApi = api as { defaults: { headers: { common: Record<string, string> } } };

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    mockApi.defaults.headers.common = {};
  });

  describe('initial state', () => {
    it('loads token from localStorage on init', () => {
      localStorage.setItem('token', 'stored-token');
      // Re-create pinia so store re-reads localStorage
      setActivePinia(createPinia());
      const store = useAuthStore();
      expect(store.token).toBe('stored-token');
    });

    it('has null token when localStorage is empty', () => {
      const store = useAuthStore();
      expect(store.token).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('is false when token is null', () => {
      const store = useAuthStore();
      expect(store.isAuthenticated).toBe(false);
    });

    it('is true after login', () => {
      const store = useAuthStore();
      store.login('some-token');
      expect(store.isAuthenticated).toBe(true);
    });
  });

  describe('login', () => {
    it('sets the token in state', () => {
      const store = useAuthStore();
      store.login('my-jwt');
      expect(store.token).toBe('my-jwt');
    });

    it('persists the token to localStorage', () => {
      const store = useAuthStore();
      store.login('my-jwt');
      expect(localStorage.getItem('token')).toBe('my-jwt');
    });

    it('sets the Authorization header on the api instance', () => {
      const store = useAuthStore();
      store.login('my-jwt');
      expect(mockApi.defaults.headers.common['Authorization']).toBe('Bearer my-jwt');
    });
  });

  describe('logout', () => {
    it('clears the token from state', () => {
      const store = useAuthStore();
      store.login('my-jwt');
      store.logout();
      expect(store.token).toBeNull();
    });

    it('clears the user from state', () => {
      const store = useAuthStore();
      store.login('my-jwt');
      (store as any).user = { id: '1', email: 'a@a.com', name: 'A' };
      store.logout();
      expect(store.user).toBeNull();
    });

    it('removes the token from localStorage', () => {
      const store = useAuthStore();
      store.login('my-jwt');
      store.logout();
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('removes the Authorization header', () => {
      const store = useAuthStore();
      store.login('my-jwt');
      store.logout();
      expect(mockApi.defaults.headers.common['Authorization']).toBeUndefined();
    });
  });

  describe('checkAuth', () => {
    it('restores token from localStorage and sets axios header', () => {
      localStorage.setItem('token', 'restored-token');
      const store = useAuthStore();
      store.checkAuth();
      expect(store.token).toBe('restored-token');
      expect(mockApi.defaults.headers.common['Authorization']).toBe('Bearer restored-token');
    });

    it('does nothing when localStorage has no token', () => {
      const store = useAuthStore();
      store.checkAuth();
      expect(store.token).toBeNull();
    });
  });
});
