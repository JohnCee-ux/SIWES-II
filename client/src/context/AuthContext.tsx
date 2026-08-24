import React, { createContext, useContext, useState, useEffect } from 'react';
import { IOrganizer } from '../../../shared/types.js';
import { api } from '../api/apiClient.js';

interface AuthContextType {
  organizer: IOrganizer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: { email: string; password: string }) => Promise<void>;
  register: (data: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organizer, setOrganizer] = useState<IOrganizer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('gatekeeper_token');
      if (!token) {
        setOrganizer(null);
        setIsLoading(false);
        return;
      }
      const res = await api.getMe();
      setOrganizer(res.organizer);
    } catch {
      localStorage.removeItem('gatekeeper_token');
      setOrganizer(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (data: { email: string; password: string }) => {
    const res = await api.loginOrganizer(data);
    setOrganizer(res.organizer);
  };

  const register = async (data: { name: string; email: string; password: string }) => {
    const res = await api.registerOrganizer(data);
    setOrganizer(res.organizer);
  };

  const logout = async () => {
    try {
      await api.logoutOrganizer();
    } finally {
      setOrganizer(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        organizer,
        isAuthenticated: !!organizer,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
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
