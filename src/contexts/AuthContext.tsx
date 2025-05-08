import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { API_BASE } from '../api';

type User = {
  username: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);
  
  // Check for existing logged-in user on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem('auth_user');
      if (storedUser) {
        try {
          // Parse the stored user data
          const userData = JSON.parse(storedUser);
          setUser(userData);
          
          // Optionally verify with the server that the session is still valid
          // This is a lightweight check to ensure the session hasn't expired on the server
          try {
            const response = await fetch(`${API_BASE}/test`, {
              headers: {
                // You could add authorization headers here if needed
                'Content-Type': 'application/json'
              }
            });
            
            // If the server responds with an unauthorized status, clear the session
            if (response.status === 401) {
              console.warn('Session expired, logging out');
              localStorage.removeItem('auth_user');
              setUser(null);
            }
          } catch (serverCheckError) {
            // If server check fails, still keep the user logged in
            // This handles offline scenarios or temporary API issues
            console.warn('Could not verify session with server:', serverCheckError);
          }
        } catch (e) {
          console.error('Failed to parse stored user data:', e);
          localStorage.removeItem('auth_user');
          setUser(null);
        }
      }
      // Finish loading regardless of outcome
      setLoading(false);
    };
    
    initializeAuth();
  }, []);
  
  // Login function
  async function login(username: string, password: string) {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Login failed');
      }
      
      const userData = await response.json();
      setUser(userData);
      localStorage.setItem('auth_user', JSON.stringify(userData));
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  }
  
  // Logout function
  function logout() {
    setUser(null);
    localStorage.removeItem('auth_user');
  }
  
  const value = {
    user,
    login,
    logout,
    loading,
    error
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
