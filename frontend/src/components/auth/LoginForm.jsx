// src/components/auth/LoginForm.jsx
import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, MapPin, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { toast } from 'react-toastify';

const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    watch, // ADDED: watch function for form field observation
    formState: { errors },
    setError,
    clearErrors
  } = useForm();

  // Get redirect info from location state
  const { 
    from = { pathname: '/dashboard' }, 
    message,
    bookingData,
    returnUrl = '/dashboard',
    selectedSchedule
  } = location.state || {};

  // Memoized computed values
  const isFromBookingFlow = useMemo(() => {
    return returnUrl === '/schedules' || bookingData || localStorage.getItem('pendingBookingData');
  }, [returnUrl, bookingData]);

  const bookingContextMessage = useMemo(() => {
    return message || 'Please login to view available schedules and complete your booking';
  }, [message]);

  // Watch email field for role detection
  const emailValue = watch('email', '');

  // Get role-specific login hints - FIXED: using emailValue instead of watch()
  const getRoleLoginHint = () => {
    if (!emailValue) return '👤 Enter your email to continue';
    if (emailValue.includes('admin')) return '👑 Admin Access Detected';
    if (emailValue.includes('operator')) return '🏢 Operator Portal Detected';
    if (emailValue.includes('ticketer')) return '🎫 Ticketer System Detected';
    if (emailValue.includes('driver')) return '🚌 Driver Console Detected';
    return '👤 Customer Account Access';
  };

  // Handle booking data extraction and storage
  const handleBookingData = () => {
    let finalBookingData = null;

    // Priority 1: Location state booking data
    if (bookingData) {
      console.log('📋 Using booking data from location state');
      finalBookingData = bookingData;
      localStorage.setItem('bookingFormData', JSON.stringify(bookingData));
    }
    // Priority 2: Pending booking data from localStorage
    else if (localStorage.getItem('pendingBookingData')) {
      console.log('📋 Using pending booking data from localStorage');
      finalBookingData = JSON.parse(localStorage.getItem('pendingBookingData'));
      localStorage.setItem('bookingFormData', JSON.stringify(finalBookingData));
      localStorage.removeItem('pendingBookingData');
    }

    // Store selected schedule if available
    if (selectedSchedule) {
      console.log('📋 Using selected schedule from location state');
      localStorage.setItem('selectedSchedule', JSON.stringify(selectedSchedule));
    }

    return finalBookingData;
  };

  // Determine redirect URL based on context
  const getRedirectUrl = (finalBookingData) => {
    if (finalBookingData) {
      console.log('🎯 Redirecting to SCHEDULES with booking data');
      return '/schedules';
    }
    
    if (returnUrl && returnUrl !== '/dashboard') {
      console.log('🎯 Redirecting to provided return URL:', returnUrl);
      return returnUrl;
    }
    
    return null;
  };

  // FIXED: Enhanced role-based navigation
  const handleRoleBasedNavigation = (userRole, userData) => {
    const roleRoutes = {
      admin: '/admin/dashboard',
      operator: '/operator/dashboard',
      ticketer: '/ticketer/dashboard',
      driver: '/driver/schedules',
      customer: '/customer/dashboard'
    };

    const targetRoute = roleRoutes[userRole] || '/customer/dashboard';
    
    console.log(`🔄 Redirecting ${userRole} to: ${targetRoute}`, userData);
    
    // Store role-specific data if needed
    if (userRole === 'driver') {
      localStorage.setItem('driverAccess', 'true');
    } else if (userRole === 'operator') {
      localStorage.setItem('operatorAccess', 'true');
    }

    navigate(targetRoute, { 
      replace: true,
      state: { 
        user: userData,
        loginTime: new Date().toISOString(),
        welcomeMessage: `Welcome back, ${userData?.name || 'User'}!`
      }
    });
  };


const handleLoginError = (error) => {
  let errorMessage = 'Login failed. Please try again.';

  if (error?.message) {
    errorMessage = error.message;
  } else if (error?.response?.data?.message) {
    errorMessage = error.response.data.message;
  } else if (error?.response?.data?.error) {
    errorMessage = error.response.data.error;
  }

  clearErrors();

  const lower = String(errorMessage || '').toLowerCase();

  // Specific error handling
  if (lower.includes('invalid') || lower.includes('credentials') || lower.includes('password')) {
    setError('password', {
      type: 'manual',
      message: 'Invalid email or password'
    });
    setError('email', {
      type: 'manual',
      message: ' ' // Empty message to show red border
    });
  } else if (lower.includes('email') || lower.includes('user not found')) {
    setError('email', {
      type: 'manual',
      message: 'No account found with this email'
    });
  } else {
    setError('root', {
      type: 'manual',
      message: errorMessage
    });
  }

  toast.error(errorMessage);
};



const onSubmit = async (data) => {
  setLoading(true);
  clearErrors();

  try {
    console.log('🔄 LoginForm: Submitting form...', { 
      email: data.email,
      hasBookingContext: isFromBookingFlow 
    });

    const result = await login(data.email, data.password);
    
    if (result.success) {
      console.log('✅ LoginForm: Login successful for user:', result.user.role, result.user);
      toast.success(`Welcome back, ${result.user.name}!`);

      // Handle booking data and determine redirect
      const finalBookingData = handleBookingData();
      const redirectUrl = getRedirectUrl(finalBookingData);

      // Perform navigation
      if (redirectUrl === '/schedules' && finalBookingData) {
        navigate('/schedules', { 
          state: { 
            bookingData: finalBookingData,
            redirectFrom: 'login',
            selectedSchedule: selectedSchedule,
            user: result.user
          },
          replace: true
        });
      } else if (redirectUrl) {
        navigate(redirectUrl, { replace: true });
      } else {
        handleRoleBasedNavigation(result.user.role, result.user);
      }
    } else {
      // Handle login failure with guarded error message
      handleLoginError(new Error(result?.error || 'Login failed'));
    }
  } catch (error) {
    console.error('❌ LoginForm: Unexpected error:', error);
    handleLoginError(error);
  } finally {
    setLoading(false);
  }
};

  // Input field classes
  const inputBaseClasses = "w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors hover:border-gray-400";
  const inputErrorClasses = "border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500";
  const inputWithIconClasses = "pl-10 pr-10";

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
          
          {/* Role Detection Hint */}
          <div className="mt-3 p-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">
              {getRoleLoginHint()}
            </p>
          </div>
          
          {/* Contextual Messages */}
          {isFromBookingFlow && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center mb-2">
                <MapPin className="h-5 w-5 text-blue-600 mr-2" />
                <p className="text-sm font-medium text-blue-800">Continue Your Booking</p>
              </div>
              <p className="text-sm text-blue-700">
                {bookingContextMessage}
              </p>
            </div>
          )}
          
          {!isFromBookingFlow && message && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">{message}</p>
            </div>
          )}

          {/* Root Error Display */}
          {errors.root && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-sm text-red-700">{errors.root.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                id="email"
                type="email"
                className={`
                  ${inputBaseClasses} 
                  ${inputWithIconClasses}
                  ${errors.email ? inputErrorClasses : ''}
                `}
                placeholder="Enter your email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email address'
                  },
                  onChange: () => clearErrors('email')
                })}
              />
            </div>
            {errors.email && errors.email.message && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`
                  ${inputBaseClasses} 
                  ${inputWithIconClasses}
                  ${errors.password ? inputErrorClasses : ''}
                `}
                placeholder="Enter your password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
                  },
                  onChange: () => clearErrors('password')
                })}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:transform-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="flex flex-col items-start">
                  <span>Signing in...</span>
                  <span className="text-xs font-normal opacity-90">
                    {isFromBookingFlow ? 'Redirecting to schedules' : 'Accessing your account'}
                  </span>
                </span>
              </div>
            ) : (
              <span className="flex flex-col items-start">
                <span>Sign In</span>
                <span className="text-xs font-normal opacity-90">
                  {isFromBookingFlow ? 'Continue to schedules' : 'Access your dashboard'}
                </span>
              </span>
            )}
          </button>

          {/* Additional Links */}
          <div className="text-center space-y-4 pt-4">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link 
                to="/register" 
                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors focus:outline-none focus:underline"
                state={location.state}
              >
                Sign up now
              </Link>
            </p>
            
           
            {/* Forgot Password Link */}
            <div className="pt-2">
              <Link 
                to="/forgot-password" 
                className="text-gray-500 hover:text-gray-700 text-sm transition-colors focus:outline-none focus:underline"
              >
                Forgot your password?
              </Link>
            </div>

           
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;