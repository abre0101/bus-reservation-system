// src/hooks/useAuth.jsx
import React, { useState, useContext, createContext, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        console.log('🔄 useAuth: Checking authentication status...');
        
        if (authService.isAuthenticated()) {
          // First set user from localStorage for immediate UI
          const storedUser = authService.getUserData();
          if (storedUser) {
            console.log('📦 useAuth: Found stored user:', storedUser);
            setUser(storedUser);
          }
          
          // Then try to validate with server
          try {
            console.log('🔄 useAuth: Validating token with server...');
            const userData = await authService.getCurrentUser();
            console.log('✅ useAuth: Server validation successful:', userData);
            setUser(userData);
          } catch (error) {
            console.log('⚠️ useAuth: Using stored user data due to server error:', error.message);
            // Keep using stored data if server validation fails
            if (!storedUser) {
              console.log('❌ useAuth: No stored user data available, logging out');
              authService.logout();
              setUser(null);
            }
          }
        } else {
          console.log('ℹ️ useAuth: No authentication token found (this is normal for public pages)');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ useAuth: Auth check failed:', error);
        authService.logout();
        setUser(null);
      } finally {
        console.log('✅ useAuth: Auth check completed - public pages are accessible');
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

const login = async (email, password) => {
  try {
    setLoading(true);
    console.log('🔄 useAuth: Attempting login...');
    
    const result = await authService.login(email, password);
    console.log('✅ useAuth: Login result:', result);
    
    if (result.success) {
      // Use the user data directly from the login response
      const userData = result.user;
      console.log('✅ useAuth: Setting user data:', userData);
      
      setUser(userData);
      
      return { 
        success: true, 
        user: userData,
        token: result.token 
      };
    } else {
      console.log('❌ useAuth: Login failed:', result.error);
      return { 
        success: false, 
        error: result.error || 'Login failed' 
      };
    }
  } catch (error) {
    console.error('❌ useAuth: Login error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  } finally {
    setLoading(false);
  }
};
  const register = async (userData) => {
    try {
      setLoading(true);
      console.log('🔄 useAuth: Attempting registration...');
      
      const result = await authService.register(userData);
      console.log('✅ useAuth: Registration result:', result);
      
      // Check for token in different possible fields
      const token = result.token || result.access_token || result.accessToken;
      
      if (token) {
        const userData = authService.getUserData();
        setUser(userData);
        return { success: true, user: userData };
      } else {
        console.log('❌ useAuth: No token found in registration response');
        return { 
          success: false, 
          error: 'Registration failed - no authentication token received' 
        };
      }
    } catch (error) {
      console.error('❌ useAuth: Registration error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('🔄 useAuth: Logging out...');
    authService.logout();
    setUser(null);
  };

  const updateUser = (updatedUserData) => {
    console.log('🔄 useAuth: Updating user data:', updatedUserData);
    setUser(updatedUserData);
    localStorage.setItem('user', JSON.stringify(updatedUserData));
  };

  const value = {
    user,
    login,
    register,
    logout,
    updateUser,
    loading,
    isAuthenticated: !!user && !!authService.getToken()
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};