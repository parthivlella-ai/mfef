import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('meditrack_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('meditrack_token') || null);
  const [loading, setLoading] = useState(true);

  // Sync token and initial profile check
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('meditrack_token');
      if (storedToken) {
        try {
          const res = await authService.getProfile();
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('meditrack_user', JSON.stringify(res.data));
          } else {
            logout();
          }
        } catch (err) {
          console.warn('Session verification notice:', err.message);
          // Token expired or invalid
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await authService.login({ email, password });
      const payload = res.data || res;
      const userToken = payload.token || res.token;
      if (userToken) {
        const userObj = {
          _id: payload._id,
          name: payload.name,
          email: payload.email,
          role: payload.role || 'user',
          pharmacyName: payload.pharmacyName,
          phone: payload.phone,
          licenseNumber: payload.licenseNumber,
        };
        setToken(userToken);
        setUser(userObj);
        localStorage.setItem('meditrack_token', userToken);
        localStorage.setItem('meditrack_user', JSON.stringify(userObj));
        return { success: true, user: userObj };
      }
      return { success: false, error: res.message || 'Login failed' };
    } catch (error) {
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const signup = async (formData) => {
    try {
      const res = await authService.register(formData);
      const payload = res.data || res;
      const userToken = payload.token || res.token;
      if (res.success || userToken) {
        const userObj = {
          _id: payload._id,
          name: payload.name,
          email: payload.email,
          role: payload.role || 'user',
          pharmacyName: payload.pharmacyName,
          phone: payload.phone,
          licenseNumber: payload.licenseNumber,
        };
        if (userToken) {
          setToken(userToken);
          localStorage.setItem('meditrack_token', userToken);
        }
        setUser(userObj);
        localStorage.setItem('meditrack_user', JSON.stringify(userObj));
        return { success: true, user: userObj };
      }
      return { success: false, error: res.message || 'Registration failed' };
    } catch (error) {
      return { success: false, error: error.message || 'Registration failed' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('meditrack_token');
    localStorage.removeItem('meditrack_user');
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await authService.updateProfile(profileData);
      if (res.success && res.data) {
        const updated = { ...user, ...res.data };
        setUser(updated);
        localStorage.setItem('meditrack_user', JSON.stringify(updated));
        return { success: true, user: updated };
      }
      throw new Error(res.message || 'Update failed');
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Helper to determine the default landing dashboard for a role
  const getDashboardRoute = (targetUser = user) => {
    return targetUser?.role === 'admin' ? '/admin' : '/dashboard';
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'admin',
    isUser: user?.role === 'user',
    login,
    signup,
    logout,
    updateProfile,
    getDashboardRoute,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
