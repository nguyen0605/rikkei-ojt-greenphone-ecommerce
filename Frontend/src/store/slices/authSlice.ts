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
  blockedReason?: string | null;
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
  blockedReason: null,
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

export const loginThunk = createAsyncThunk<
  import('@/types/api').AuthResponse & { remember?: boolean },
  LoginRequest & { remember?: boolean },
  { rejectValue: { message: string; errorCode?: string; reason?: string } }
>('auth/login', async (data, { rejectWithValue }) => {
  try {
    const res = await authService.login(data);
    return { ...res, remember: data.remember };
  } catch (err: any) {
    const responseData = err.response?.data;
    const message = responseData?.message || err.message || 'Đăng nhập thất bại';
    const errorCode = responseData?.code || responseData?.errorCode || err.errorCode;
    const reason = responseData?.reason;
    return rejectWithValue({ message, errorCode, reason });
  }
});

export const registerThunk = createAsyncThunk<
  import('@/types/api').AuthResponse,
  RegisterRequest,
  { rejectValue: { message: string; errorCode?: string } }
>('auth/register', async (data, { rejectWithValue }) => {
  try {
    return await authService.register(data);
  } catch (err: any) {
    const message = err.response?.data?.message || err.message || 'Đăng ký thất bại';
    const errorCode = err.response?.data?.errorCode || err.errorCode;
    return rejectWithValue({ message, errorCode });
  }
});

export const verifyOTPThunk = createAsyncThunk<
  import('@/types/api').AuthResponse,
  { email: string; otp: string },
  { rejectValue: { message: string; errorCode?: string } }
>('auth/verifyOTP', async (data, { rejectWithValue }) => {
  try {
    return await authService.verifyOTP(data.email, data.otp);
  } catch (err: any) {
    const message = err.response?.data?.message || err.message || 'Xác thực OTP thất bại';
    const errorCode = err.response?.data?.errorCode || err.errorCode;
    return rejectWithValue({ message, errorCode });
  }
});

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  try {
    await post('/auth/logout');
  } catch {
    // ignore
  } finally {
    setAccessToken(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('greenphone.has_session');
    }
    clearClientStorage();
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isRestoringSession = false;
      state.error = null;
      state.errorCode = null;
      state.blockedReason = null;
      setAccessToken(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('greenphone.has_session');
      }
      clearClientStorage();
    },
    clearError(state) {
      state.error = null;
      state.errorCode = null;
      state.blockedReason = null;
    },
    setCredentials(state, action: PayloadAction<{ user: { id: number; email: string; fullName: string; role: string }; token: string }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isRestoringSession = false;
      state.error = null;
      state.errorCode = null;
      state.blockedReason = null;
      setAccessToken(action.payload.token);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('greenphone.has_session', 'true');
      }
    },
    updateUserProfile(state, action: PayloadAction<{ fullName?: string; avatar?: string; phone?: string; address?: string }>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // restoreSessionThunk
      .addCase(restoreSessionThunk.pending, (state) => {
        state.isRestoringSession = true;
      })
      .addCase(restoreSessionThunk.fulfilled, (state, action) => {
        state.isRestoringSession = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
        state.errorCode = null;
        state.blockedReason = null;
      })
      .addCase(restoreSessionThunk.rejected, (state) => {
        state.isRestoringSession = false;
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
      })
      // loginThunk
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.errorCode = null;
        state.blockedReason = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.errorCode = null;
        state.user = { id: action.payload.userId, email: action.payload.email, fullName: action.payload.fullName, role: action.payload.role };
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.isRestoringSession = false;
        state.blockedReason = null;
        setAccessToken(action.payload.token);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('greenphone.has_session', 'true');
        }
        if (action.payload.remember) {
          state.rememberedEmail = action.meta.arg.email || (action.meta.arg as { email?: string; emailOrPhone?: string }).emailOrPhone || null;
          localStorage.setItem('greenphone.rememberedEmail', state.rememberedEmail || '');
        }
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.error = action.payload.message;
          state.errorCode = action.payload.errorCode || null;
          state.blockedReason = action.payload.reason || null;
        } else {
          state.error = action.error.message || 'Login failed';
        }
      })
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
        }
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isRestoringSession = false;
        state.blockedReason = null;
        setAccessToken(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('greenphone.has_session');
        }
        clearClientStorage();
      });
  },
});

export const { logout, clearError, setCredentials, updateUserProfile } = authSlice.actions;
export default authSlice.reducer;
