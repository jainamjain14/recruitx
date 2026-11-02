import { api } from './api';
import { ApiResponse, AuthResponse, User, UserRole } from '../types/auth';

export interface LoginParams {
  email: string;
  password: string;
  role?: UserRole;
  rememberMe?: boolean;
}

export interface RegisterParams {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export const authService = {
  login: async (params: LoginParams): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', params);
    return response.data;
  },

  register: async (params: RegisterParams): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', params);
    return response.data;
  },

  verifyEmail: async (email: string, code: string): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/verify-email', { email, code });
    return response.data;
  },

  resendVerification: async (email: string): Promise<ApiResponse<{ message?: string }>> => {
    const response = await api.post<ApiResponse<{ message?: string }>>('/auth/resend-verification', { email });
    return response.data;
  },

  socialLogin: async (payload: {
    email: string;
    name: string;
    provider: 'google' | 'github';
    providerId?: string;
    role?: UserRole;
    avatar?: string;
  }): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/social-login', payload);
    return response.data;
  },

  getMe: async (): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.get<ApiResponse<{ user: User }>>('/auth/me');
    return response.data;
  },

  forgotPassword: async (email: string): Promise<ApiResponse<{ resetToken: string; resetUrl?: string }>> => {
    const response = await api.post<ApiResponse<{ resetToken: string; resetUrl?: string }>>('/auth/forgot-password', { email });
    return response.data;
  },

  requestPasswordResetOtp: async (email: string): Promise<ApiResponse<{ emailSent: boolean }>> => {
    const response = await api.post<ApiResponse<{ emailSent: boolean }>>('/auth/forgot-password-otp', { email });
    return response.data;
  },

  verifyPasswordResetOtp: async (email: string, otp: string): Promise<ApiResponse<{ resetSessionToken: string }>> => {
    const response = await api.post<ApiResponse<{ resetSessionToken: string }>>('/auth/verify-password-otp', { email, otp });
    return response.data;
  },

  resetPasswordWithOtp: async (email: string, resetSessionToken: string, password: string): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>('/auth/reset-password-otp', { email, resetSessionToken, password });
    return response.data;
  },

  resetPassword: async (token: string, password: string): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>('/auth/reset-password', { token, password });
    return response.data;
  },

  logout: async (): Promise<ApiResponse> => {
    const response = await api.post<ApiResponse>('/auth/logout');
    return response.data;
  },
};
