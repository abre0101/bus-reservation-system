// src/services/authService.js
import api from './api';

export const authService = {
  async register(userData) {
    try {
      console.log('🔄 Registering user:', userData);
      
      const response = await api.post('/auth/register', userData);
      console.log('✅ Registration response:', response.data);
      
      // Handle different token field names
      const token = response.data.token || response.data.access_token || response.data.accessToken;
      const user = response.data.user || response.data.data;
      
      if (token) {
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('user', JSON.stringify(user));
        console.log('✅ Token stored in session:', token);
        console.log('✅ User stored:', user);
      } else {
        console.warn('⚠️ No token found in response');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Registration error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Registration failed. Please try again.';
      
      throw new Error(errorMessage);
    }
  },



  async login(email, password) {
    try {
      console.log('🔄 Attempting login with:', { email });
      
      const response = await api.post('/auth/login', { email, password });
      console.log('✅ Login response:', response.data);
      
      // Handle the specific response structure from your backend
      const { access_token, user } = response.data;
      
      if (access_token) {
        sessionStorage.setItem('token', access_token);
        sessionStorage.setItem('user', JSON.stringify(user));
        console.log('✅ Token stored in session:', access_token);
        console.log('✅ User stored:', user);
        return { success: true, token: access_token, user };
      } else {
        console.warn('⚠️ No access_token found in response');
        console.log('🔍 Full response:', response.data);
        return { 
          success: false, 
          error: 'No authentication token received from server' 
        };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Login failed. Please check your credentials.';
      
      throw new Error(errorMessage);
    }
  },


  async getCurrentUser() {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('Get current user error:', error);
      
      if (error.response?.status === 401) {
        this.logout();
      }
      
      throw new Error('Failed to get user data');
    }
  },

  isAuthenticated() {
    const token = sessionStorage.getItem('token');
    return !!token;
  },

  getUserData() {
    const userData = sessionStorage.getItem('user') || localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  },

  logout() {
    // Clear session storage (auth tokens)
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    
    // Clear any localStorage items (booking data, etc.)
    localStorage.removeItem('loginTime');
    localStorage.removeItem('pendingBookingData');
    localStorage.removeItem('bookingFormData');
    
    console.log('✅ User logged out - session cleared');
  },

  getToken() {
    return sessionStorage.getItem('token');
  }
};