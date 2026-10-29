import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore, type EnhancedStore } from '@reduxjs/toolkit';
import authReducer, {
  loginThunk,
  registerThunk,
  logoutThunk,
  verifyOTPThunk,
  clearError,
  logout,
} from '@/store/slices/authSlice';
import type { RootState } from '@/store/rootReducer';
import type { AuthResponse } from '@/types/api';

/**
 * Creates a fresh test store with only the auth reducer.
 */
function createTestStore(): EnhancedStore<{ auth: ReturnType<typeof authReducer> }> {
  return configureStore({
    reducer: { auth: authReducer },
  });
}

describe('authSlice', () => {
  describe('initial state', () => {
    it('should have null user and token with isAuthenticated false', () => {
      const store = createTestStore();
      const state = store.getState().auth;

      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.rememberedEmail).toBeNull();
    });
  });

  describe('reducers', () => {
    describe('clearError', () => {
      it('should set error to null', () => {
        const store = createTestStore();

        // Manually set an error by dispatching a rejected thunk
        store.dispatch({
          type: loginThunk.rejected.type,
          error: { message: 'Invalid credentials' },
        });

        expect(store.getState().auth.error).toBe('Invalid credentials');

        store.dispatch(clearError());

        expect(store.getState().auth.error).toBeNull();
      });
    });

    describe('logout', () => {
      it('should clear user, token, and set isAuthenticated to false', () => {
        const store = createTestStore();

        // Simulate a logged-in state via loginThunk.fulfilled
        store.dispatch({
          type: loginThunk.fulfilled.type,
          payload: {
            userId: 1,
            token: 'jwt-token-abc',
            fullName: 'Test User',
            email: 'test@example.com',
            role: 'ROLE_USER',
            expiresIn: 3600,
          } satisfies AuthResponse & { remember?: boolean },
        });

        expect(store.getState().auth.isAuthenticated).toBe(true);

        store.dispatch(logout());

        expect(store.getState().auth.user).toBeNull();
        expect(store.getState().auth.token).toBeNull();
        expect(store.getState().auth.isAuthenticated).toBe(false);
      });
    });
  });

  describe('async thunks — fulfilled', () => {
    describe('loginThunk.fulfilled', () => {
      it('should set user, token, and isAuthenticated', () => {
        const store = createTestStore();

        const payload: AuthResponse & { remember?: boolean } = {
          userId: 42,
          token: 'jwt-token-xyz',
          fullName: 'Jane Doe',
          email: 'jane@example.com',
          role: 'ROLE_USER',
          expiresIn: 7200,
        };

        store.dispatch({ type: loginThunk.fulfilled.type, payload });

        const state = store.getState().auth;

        expect(state.loading).toBe(false);
        expect(state.user).toEqual({
          id: 42,
          email: 'jane@example.com',
          fullName: 'Jane Doe',
          role: 'ROLE_USER',
        });
        expect(state.token).toBe('jwt-token-xyz');
        expect(state.isAuthenticated).toBe(true);
      });

      it('should store rememberedEmail when remember is true', () => {
        const store = createTestStore();

        const payload: AuthResponse & { remember: boolean } = {
          userId: 1,
          token: 'token',
          fullName: 'User',
          email: 'remember-me@example.com',
          role: 'ROLE_USER',
          expiresIn: 3600,
          remember: true,
        };

        // createAsyncThunk populates meta.arg — simulate it so the reducer
        // can read action.meta.arg.email.
        store.dispatch({
          type: loginThunk.fulfilled.type,
          payload,
          meta: { arg: { email: 'remember-me@example.com' } },
        });

        expect(store.getState().auth.rememberedEmail).toBe('remember-me@example.com');
      });

      it('should not store rememberedEmail when remember is false', () => {
        const store = createTestStore();

        const payload: AuthResponse & { remember: boolean } = {
          userId: 1,
          token: 'token',
          fullName: 'User',
          email: 'forgetful@example.com',
          role: 'ROLE_USER',
          expiresIn: 3600,
          remember: false,
        };

        store.dispatch({ type: loginThunk.fulfilled.type, payload });

        expect(store.getState().auth.rememberedEmail).toBeNull();
      });
    });

    describe('registerThunk.fulfilled', () => {
      it('should set loading to false on register success', () => {
        const store = createTestStore();

        store.dispatch({ type: registerThunk.fulfilled.type, payload: { email: 'new@example.com' } });

        const state = store.getState().auth;
        expect(state.loading).toBe(false);
        // Register does not set isAuthenticated
        expect(state.isAuthenticated).toBe(false);
      });
    });

    describe('verifyOTPThunk.fulfilled', () => {
      it('should set user, token, and isAuthenticated', () => {
        const store = createTestStore();

        const payload: AuthResponse = {
          userId: 99,
          token: 'otp-verified-token',
          fullName: 'OTP User',
          email: 'otp@example.com',
          role: 'ROLE_USER',
          expiresIn: 3600,
        };

        store.dispatch({ type: verifyOTPThunk.fulfilled.type, payload });

        const state = store.getState().auth;

        expect(state.loading).toBe(false);
        expect(state.user).toEqual({
          id: 99,
          email: 'otp@example.com',
          fullName: 'OTP User',
          role: 'ROLE_USER',
        });
        expect(state.token).toBe('otp-verified-token');
        expect(state.isAuthenticated).toBe(true);
      });
    });

    describe('logoutThunk.fulfilled', () => {
      it('should clear auth state completely', () => {
        const store = createTestStore();

        // Log in first
        store.dispatch({
          type: loginThunk.fulfilled.type,
          payload: {
            userId: 1,
            token: 'token',
            fullName: 'User',
            email: 'user@example.com',
            role: 'ROLE_USER',
            expiresIn: 3600,
          } satisfies AuthResponse,
        });

        expect(store.getState().auth.isAuthenticated).toBe(true);

        store.dispatch({ type: logoutThunk.fulfilled.type });

        const state = store.getState().auth;
        expect(state.user).toBeNull();
        expect(state.token).toBeNull();
        expect(state.isAuthenticated).toBe(false);
      });
    });
  });

  describe('async thunks — pending', () => {
    it('should set loading true and clear error on loginThunk.pending', () => {
      const store = createTestStore();

      store.dispatch({ type: loginThunk.pending.type });

      expect(store.getState().auth.loading).toBe(true);
      expect(store.getState().auth.error).toBeNull();
    });

    it('should set loading true on registerThunk.pending', () => {
      const store = createTestStore();

      store.dispatch({ type: registerThunk.pending.type });

      expect(store.getState().auth.loading).toBe(true);
      expect(store.getState().auth.error).toBeNull();
    });

    it('should set loading true on verifyOTPThunk.pending', () => {
      const store = createTestStore();

      store.dispatch({ type: verifyOTPThunk.pending.type });

      expect(store.getState().auth.loading).toBe(true);
    });
  });

  describe('async thunks — rejected', () => {
    it('should set loading false and error on loginThunk.rejected', () => {
      const store = createTestStore();

      store.dispatch({
        type: loginThunk.rejected.type,
        error: { message: 'Invalid email or password' },
      });

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Invalid email or password');
      expect(state.isAuthenticated).toBe(false);
    });

    it('should fall back to a default message if error.message is absent', () => {
      const store = createTestStore();

      store.dispatch({
        type: loginThunk.rejected.type,
        error: {},
      });

      expect(store.getState().auth.error).toBe('Login failed');
    });

    it('should set error on registerThunk.rejected', () => {
      const store = createTestStore();

      store.dispatch({
        type: registerThunk.rejected.type,
        error: { message: 'Email already exists' },
      });

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Email already exists');
    });

    it('should fall back to default message on registerThunk.rejected', () => {
      const store = createTestStore();

      store.dispatch({ type: registerThunk.rejected.type, error: {} });

      expect(store.getState().auth.error).toBe('Register failed');
    });

    it('should set error on verifyOTPThunk.rejected', () => {
      const store = createTestStore();

      store.dispatch({
        type: verifyOTPThunk.rejected.type,
        error: { message: 'Invalid OTP code' },
      });

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Invalid OTP code');
    });

    it('should fall back to default message on verifyOTPThunk.rejected', () => {
      const store = createTestStore();

      store.dispatch({ type: verifyOTPThunk.rejected.type, error: {} });

      expect(store.getState().auth.error).toBe('OTP verification failed');
    });
  });
});
