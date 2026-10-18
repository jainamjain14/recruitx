import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types/auth';
import { authService, LoginParams, RegisterParams } from '../services/authService';
import { tokenStorage } from '../utils/tokenStorage';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (params: LoginParams) => Promise<User>;
  register: (params: RegisterParams) => Promise<{ user: User; requiresVerification?: boolean }>;
  verifyEmail: (email: string, code: string) => Promise<User>;
  resendVerification: (email: string) => Promise<{ message?: string }>;
  socialLogin: (payload: {
    email: string;
    name: string;
    provider: 'google' | 'github';
    providerId?: string;
    role: UserRole;
    avatar?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  updateUser: (updatedUser: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(tokenStorage.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = tokenStorage.getToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await authService.getMe();
        if (response.success && response.data?.user) {
          setUser(response.data.user);
          setToken(storedToken);
        } else {
          tokenStorage.removeToken();
          setToken(null);
          setUser(null);
        }
      } catch (error) {
        console.warn('Session verification failed on mount:', error);
        tokenStorage.removeToken();
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (params: LoginParams): Promise<User> => {
    const response = await authService.login(params);
    if (response.success && response.data) {
      const { user: loggedInUser, token: authToken } = response.data;
      tokenStorage.setToken(authToken);
      setToken(authToken);
      setUser(loggedInUser);
      return loggedInUser;
    } else {
      throw new Error(response.message || 'Login failed');
    }
  };

  const register = async (params: RegisterParams): Promise<{ user: User; requiresVerification?: boolean; demoCode?: string }> => {
    const response = await authService.register(params);
    if (response.success && response.data) {
      const { user: registeredUser, token: authToken, requiresVerification, demoCode } = response.data;
      if (authToken) {
        tokenStorage.setToken(authToken);
        setToken(authToken);
        setUser(registeredUser);
      }
      return { user: registeredUser, requiresVerification, demoCode };
    } else {
      throw new Error(response.message || 'Registration failed');
    }
  };

  const verifyEmail = async (email: string, code: string): Promise<User> => {
    const response = await authService.verifyEmail(email, code);
    if (response.success && response.data) {
      const { user: verifiedUser, token: authToken } = response.data;
      tokenStorage.setToken(authToken);
      setToken(authToken);
      setUser(verifiedUser);
      return verifiedUser;
    } else {
      throw new Error(response.message || 'Verification failed');
    }
  };

  const resendVerification = async (email: string): Promise<{ message?: string }> => {
    const response = await authService.resendVerification(email);
    if (response.success) {
      return { message: response.message };
    } else {
      throw new Error(response.message || 'Failed to resend code');
    }
  };

  const socialLogin = async (payload: {
    email: string;
    name: string;
    provider: 'google' | 'github';
    providerId?: string;
    role: UserRole;
    avatar?: string;
  }): Promise<User> => {
    const response = await authService.socialLogin(payload);
    if (response.success && response.data) {
      const { user: socialUser, token: authToken } = response.data;
      tokenStorage.setToken(authToken);
      setToken(authToken);
      setUser(socialUser);
      return socialUser;
    } else {
      throw new Error(response.message || 'Social login failed');
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn('Logout API error:', error);
    } finally {
      tokenStorage.removeToken();
      setToken(null);
      setUser(null);
    }
  };

  const updateUser = (updatedUser: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updatedUser } : (updatedUser as User)));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        login,
        register,
        verifyEmail,
        resendVerification,
        socialLogin,
        logout,
        setUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
