import { get, post, put } from './api';
import type { AuthResponse, LoginRequest, RegisterRequest, UserDTO, UserProfileRequest, ChangePasswordRequest } from '@/types/api';

export const authService = {
  login: (data: LoginRequest) => post<AuthResponse>('/auth/login', data),
  register: (data: RegisterRequest) => post<AuthResponse>('/auth/register', data),
  logout: () => post<void>('/auth/logout'),
  me: () => get<UserDTO>('/auth/me'),
  forgotPassword: (email: string) => post<void>('/auth/forgot-password', { email }),
  resetPassword: (email: string, otp: string, newPassword: string) => post<void>('/auth/reset-password', { email, otp, newPassword }),
  verifyOTP: (email: string, otp: string) => post<AuthResponse>('/auth/verify-otp', { email, otp }),
};

export const userService = {
  getProfile: () => get<UserDTO>('/users/profile'),
  updateProfile: (data: UserProfileRequest) => put<UserDTO>('/users/profile', data),
  changePassword: (data: ChangePasswordRequest) => put<void>('/users/change-password', data),
};
