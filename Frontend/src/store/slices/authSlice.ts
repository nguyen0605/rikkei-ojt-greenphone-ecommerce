import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { authService } from '@/services/authService';
import { post } from '@/services/api';
import { isTokenValid } from '@/utils/jwt';
import type { LoginRequest, RegisterRequest } from '@/types/api';

interface AuthState {
  user: { id: number; email: string; fullName: string; role: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  rememberedEmail: string | null;
}

const token = typeof window !== 'undefined' ? localStorage.getItem('greenphone.token') : null;
const rememberedEmail = typeof window !== 'undefined' ? localStorage.getItem('greenphone.rememberedEmail') : null;

// Check token expiry on load — clear if expired
const validToken = isTokenValid(token) ? token : null;
if (!validToken && token) {
  // Token exists but is expired — clean up
  localStorage.removeItem('greenphone.token');
  localStorage.removeItem('greenphone.user');
}

// Restore user info from localStorage so RequireAuth works after page reload
function loadUser(): AuthState['user'] {
  if (typeof window === 'undefined') return null;
  if (!validToken) return null;
  try {
    const raw = localStorage.getItem('greenphone.user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const initialState: AuthState = {
  user: loadUser(),
  token: validToken,
  isAuthenticated: !!validToken && !!loadUser(),
  loading: false,
  error: null,
  rememberedEmail,
};

export const loginThunk = createAsyncThunk('auth/login', async (data: LoginRequest & { remember?: boolean }) => {
  const res = await authService.login(data);
  return { ...res, remember: data.remember };
});

export const registerThunk = createAsyncThunk('auth/register', async (data: RegisterRequest) => {
  const res = await authService.register(data);
  return { email: data.email };
});

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

export const verifyOTPThunk = createAsyncThunk('auth/verifyOTP', async (data: { email: string; otp: string }) => {
  const res = await post<{ userId: number; token: string; fullName: string; email: string; role: string }>('/auth/verify-otp', data);
  return res;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('greenphone.token');
      localStorage.removeItem('greenphone.user');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = { id: action.payload.userId, email: action.payload.email, fullName: action.payload.fullName, role: action.payload.role };
        state.token = action.payload.token;
        state.isAuthenticated = true;
        localStorage.setItem('greenphone.token', action.payload.token);
        localStorage.setItem('greenphone.user', JSON.stringify(state.user));
        if (action.payload.remember) {
          state.rememberedEmail = action.meta.arg.email || (action.meta.arg as any).emailOrPhone;
          localStorage.setItem('greenphone.rememberedEmail', state.rememberedEmail || '');
        }
      })
      .addCase(loginThunk.rejected, (state, action) => { state.loading = false; state.error = action.error.message || 'Login failed'; })
      .addCase(registerThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(registerThunk.fulfilled, (state) => { state.loading = false; })
      .addCase(registerThunk.rejected, (state, action) => { state.loading = false; state.error = action.error.message || 'Register failed'; })
      .addCase(verifyOTPThunk.pending, (state) => { state.loading = true; })
      .addCase(verifyOTPThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = { id: action.payload.userId, email: action.payload.email, fullName: action.payload.fullName, role: action.payload.role };
        state.token = action.payload.token;
        state.isAuthenticated = true;
        localStorage.setItem('greenphone.token', action.payload.token);
        localStorage.setItem('greenphone.user', JSON.stringify(state.user));
      })
      .addCase(verifyOTPThunk.rejected, (state, action) => { state.loading = false; state.error = action.error.message || 'OTP verification failed'; })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem('greenphone.token');
        localStorage.removeItem('greenphone.user');
      });
  },
});

export const { clearError, logout } = authSlice.actions;
export default authSlice.reducer;