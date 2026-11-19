import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { authService } from '@/services/authService';
import { post, clearClientStorage, setAccessToken } from '@/services/api';
import type { LoginRequest, RegisterRequest } from '@/types/api';

interface AuthState {
  user: { id: number; email: string; fullName: string; role: string; avatar?: string; phone?: string; address?: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  isRestoringSession?: boolean;
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  rememberedEmail: string | null;
}

const rememberedEmail = typeof window !== 'undefined' ? localStorage.getItem('greenphone.rememberedEmail') : null;
const hasSessionFlag = typeof window !== 'undefined' ? sessionStorage.getItem('greenphone.has_session') === 'true' : false;

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isRestoringSession: hasSessionFlag,
  loading: false,
  error: null,
  errorCode: null,
  rememberedEmail,
};

export const restoreSessionThunk = createAsyncThunk<
  { token: string; user: any },
  void,
  { rejectValue: null }
>('auth/restoreSession', async (_, { rejectWithValue }) => {
  try {
    const res = await authService.refreshToken();
    if (res?.token) {
      setAccessToken(res.token);
      const user = await authService.me();
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('greenphone.has_session', 'true');
      }
      return { token: res.token, user };
    }
    return rejectWithValue(null);
  } catch {
    setAccessToken(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('greenphone.has_session');
    }
    return rejectWithValue(null);
  }
});

export const loginThunk = createAsyncThunk('auth/login', async (data: LoginRequest & { remember?: boolean }) => {
  const res = await authService.login(data);
  return { ...res, remember: data.remember };
});

export const registerThunk = createAsyncThunk<
  { email: string },
  RegisterRequest,
  { rejectValue: { message: string; errorCode?: string } }
>('auth/register', async (data, { rejectWithValue }) => {
  try {
    await authService.register(data);
    return { email: data.email };
  } catch (err: any) {
    const message = err.response?.data?.message || err.message || 'Đăng ký thất bại';
    const errorCode = err.response?.data?.errorCode || err.errorCode;
    return rejectWithValue({ message, errorCode });
  }
});

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

export const verifyOTPThunk = createAsyncThunk<
  { userId: number; token: string; fullName: string; email: string; role: string },
  { email: string; otp: string },
  { rejectValue: { message: string; errorCode?: string } }
>('auth/verifyOTP', async (data, { rejectWithValue }) => {
  try {
    const res = await post<{ userId: number; token: string; fullName: string; email: string; role: string }>('/auth/verify-otp', data);
    return res;
  } catch (err: any) {
    const message = err.response?.data?.message || err.message || 'OTP verification failed';
    const errorCode = err.response?.data?.errorCode || err.errorCode;
    return rejectWithValue({ message, errorCode });
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
      state.errorCode = null;
    },
    updateUserProfile(state, action: PayloadAction<{ fullName?: string; phone?: string; address?: string; avatar?: string }>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isRestoringSession = false;
      state.error = null;
      state.errorCode = null;
      setAccessToken(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('greenphone.has_session');
      }
      clearClientStorage();
    },
    setCredentials(state, action: PayloadAction<{ user: { id: number; email: string; fullName: string; role: string }; token: string }>) {
      state.loading = false;
      state.error = null;
      state.errorCode = null;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isRestoringSession = false;
      setAccessToken(action.payload.token);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('greenphone.has_session', 'true');
      }
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
        state.isRestoringSession = false;
        setAccessToken(action.payload.token);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('greenphone.has_session', 'true');
        }
        if (action.payload.remember) {
          state.rememberedEmail = action.meta.arg.email || (action.meta.arg as { email?: string; emailOrPhone?: string }).emailOrPhone || null;
          localStorage.setItem('greenphone.rememberedEmail', state.rememberedEmail || '');
        }
      })
      .addCase(loginThunk.rejected, (state, action) => { state.loading = false; state.error = action.error.message || 'Login failed'; })
      .addCase(registerThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(registerThunk.fulfilled, (state) => { state.loading = false; })
      .addCase(registerThunk.rejected, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.error = action.payload.message;
          state.errorCode = action.payload.errorCode || null;
        } else {
          state.error = action.error.message || 'Register failed';
        }
      })
      .addCase(verifyOTPThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.errorCode = null;
      })
      .addCase(verifyOTPThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.errorCode = null;
        state.user = { id: action.payload.userId, email: action.payload.email, fullName: action.payload.fullName, role: action.payload.role };
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.isRestoringSession = false;
        setAccessToken(action.payload.token);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('greenphone.has_session', 'true');
        }
      })
      .addCase(verifyOTPThunk.rejected, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.error = action.payload.message;
          state.errorCode = action.payload.errorCode || null;
        } else {
          state.error = action.error.message || 'OTP verification failed';
          state.errorCode = null;
        }
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isRestoringSession = false;
        state.error = null;
        state.errorCode = null;
        setAccessToken(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('greenphone.has_session');
        }
        clearClientStorage();
      })
      .addCase(restoreSessionThunk.pending, (state) => {
        state.isRestoringSession = true;
      })
      .addCase(restoreSessionThunk.fulfilled, (state, action) => {
        state.isRestoringSession = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(restoreSessionThunk.rejected, (state) => {
        state.isRestoringSession = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, logout, updateUserProfile, setCredentials } = authSlice.actions;
export default authSlice.reducer;