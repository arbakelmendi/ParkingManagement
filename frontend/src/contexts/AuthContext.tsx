import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, authApi, AuthResponse } from '@/lib/api';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (name: string, email: string, password: string) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeRole = (role?: string) => {
  const roleRaw = String(role ?? '').toLowerCase().trim();
  return roleRaw.includes('admin') ? 'admin' : 'user';
};

const normalizeUser = (user: User): User => ({
  ...user,
  role: normalizeRole(user.role),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as User;
        setToken(storedToken);
        setUser(normalizeUser(parsed));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    setIsLoading(false);
  }, []);

  const applyAuthResponse = useCallback((response: AuthResponse) => {
    const normalizedUser = normalizeUser(response.user);

    setToken(response.token);
    setUser(normalizedUser);

    // persist to localStorage
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      console.log('AUTH API LOGIN RESPONSE:', response);

      applyAuthResponse(response);

      toast.success('Welcome back!', {
        description: `Logged in as ${response.user.name}`,
      });

      return response;
    } catch (error: any) {
      toast.error('Login failed', {
        description: error.message || 'Please check your credentials',
      });
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await authApi.register({ name, email, password });
      applyAuthResponse(response);

      toast.success('Welcome!', {
        description: 'Your account has been created successfully',
      });

      return response;
    } catch (error: any) {
      toast.error('Registration failed', {
        description: error.message || 'Please try again',
      });
      throw error;
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    isAdmin: normalizeRole(user?.role) === 'admin',
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
