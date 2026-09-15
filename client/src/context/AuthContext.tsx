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
  register: (params: RegisterParams) => Promise<User>;
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

  const register = async (params: RegisterParams): Promise<User> => {
    const response = await authService.register(params);
    if (response.success && response.data) {
      const { user: registeredUser, token: authToken } = response.data;
      tokenStorage.setToken(authToken);
      setToken(authToken);
      setUser(registeredUser);
      return registeredUser;
    } else {
      throw new Error(response.message || 'Registration failed');
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
        logout,
        setUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
