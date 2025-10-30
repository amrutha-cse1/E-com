import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Resolve backend URL with a safe development fallback.
const getBackendUrl = () => {
  const env = process.env.REACT_APP_BACKEND_URL;
  const defaultLocal = 'http://localhost:8000';
  if (!env) return defaultLocal;
  try {
      if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      // If running locally and env points to a preview host, prefer local backend.
      if ((host === 'localhost' || host === '127.0.0.1') && env.includes('preview')) {
        return defaultLocal;
      }
    }
  } catch (e) {
    // ignore and fall back to env
  }
  return env;
};

const BACKEND_URL = getBackendUrl();
const API = `${BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const verifyToken = async () => {
      const savedToken = localStorage.getItem('token');
      try {
        // Try fetching current user with token if available, otherwise call without auth.
        const headers = savedToken ? { Authorization: `Bearer ${savedToken}` } : {};
        const response = await axios.get(`${API}/auth/me`, { headers });
        setUser(response.data);
        if (savedToken) setToken(savedToken);
      } catch (error) {
        // If token invalid or backend returned error, clear stored token and proceed as anonymous
        console.warn('Could not fetch current user (will use mock/demo user):', error.message || error);
        localStorage.removeItem('token');
        setToken(null);
      }
      setLoading(false);
    };

    verifyToken();
  }, []);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const register = async (email, password, name) => {
    const response = await axios.post(`${API}/auth/register`, { email, password, name });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const getAuthHeader = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, getAuthHeader }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
