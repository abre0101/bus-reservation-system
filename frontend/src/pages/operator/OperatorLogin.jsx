import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bus, Mail, Lock, AlertCircle, Shield, Users, Truck, UserCog } from 'lucide-react'
import api from '../../services/api'

const OperatorLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    try {
      console.log('🔐 Attempting operator login...', formData.email);
      
      const response = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password,
        loginType: 'operator' // Add this to distinguish from customer login
      })
      
      console.log('✅ Login response:', response.data);
      
      // Check if user has appropriate role
      const user = response.data.user
      const allowedRoles = ['operator', 'driver', 'admin', 'ticketer']
      
      if (!user || !allowedRoles.includes(user.role)) {
        setError('Access denied. Operator panel requires operator, driver, ticketer, or admin role.')
        setLoading(false)
        return
      }

      // Store token and user data for operator portal
      const token = response.data.access_token || response.data.token;
      console.log('✅ Token received, user role:', user.role);
      console.log('✅ User ID:', user.id);
      
      if (!token) {
        throw new Error('No access token received from server');
      }
      
      // Store with operator-specific keys
      localStorage.setItem('operatorToken', token);
      localStorage.setItem('operatorId', user.id || user._id || user.user_id);
      localStorage.setItem('operatorData', JSON.stringify(user));
      
      // Also store in standard keys for compatibility
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      console.log('✅ Login successful, redirecting to operator dashboard...');
      
      // Redirect based on role
      setTimeout(() => {
        navigate('/operator/dashboard', { replace: true });
      }, 500);
      
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('❌ Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message ||
                          'Login failed. Please check your credentials.';
      
      setError(errorMessage);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center space-x-2 text-white mb-8">
            <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center">
              <span className="text-green-600 text-2xl font-bold">EB</span>
            </div>
            <span className="text-2xl font-bold">EthioBus</span>
          </Link>
          <h1 className="text-3xl font-bold text-white">Operator Portal</h1>
          <p className="mt-2 text-green-100">
            Sign in for operators, drivers, and ticketers
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 transition-colors"
                placeholder="operator@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 transition-colors"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in to Operator Portal'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center text-sm text-gray-600 mb-4">
              <p className="font-medium mb-2">Accessible for:</p>
              <div className="flex justify-center space-x-4 text-xs">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Operators</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Drivers</span>
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">Ticketers</span>
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded">Admins</span>
              </div>
            </div>
            
            <div className="flex justify-between text-sm">
              <Link 
                to="/login" 
                className="text-green-600 hover:text-green-700 font-medium transition-colors"
              >
                ← Customer Login
              </Link>
              <Link 
                to="/forgot-password" 
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-green-100 text-sm">
            © {new Date().getFullYear()} EthioBus. Operator Portal
          </p>
        </div>
      </div>
    </div>
  )
}

export default OperatorLogin