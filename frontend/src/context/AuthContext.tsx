import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser } from '../types';
import { api, getAuthToken, setAuthToken } from '../services/api';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  loginWithPreset: (preset: { username: string; password: string }) => Promise<AuthUser>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isPhcOperator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getAuthToken();
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const currentUser = await api.getMe();
        setUser(currentUser);
        setToken(storedToken);
      } catch (err) {
        console.warn('Session expired or invalid, logging out', err);
        setAuthToken(null);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<AuthUser> => {
    setLoading(true);
    try {
      const res = await api.login(username, password);
      setUser(res.user);
      setToken(res.token);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const loginWithPreset = async (preset: { username: string; password: string }): Promise<AuthUser> => {
    return login(preset.username, preset.password);
  };

  const logout = () => {
    api.logout();
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const isPhcOperator = user?.role === 'phc_operator';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginWithPreset,
        logout,
        isAuthenticated,
        isAdmin,
        isPhcOperator,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
