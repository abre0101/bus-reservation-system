import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { userService } from '../../services/userService'
import { 
  User, Mail, Phone, MapPin, Calendar, 
  Edit, Save, X, Shield, AlertCircle,
  CheckCircle
} from 'lucide-react'

const CustomerProfile = () => {
  const { user, updateUser } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: ''
  })
  const [errors, setErrors] = useState({})

  // Reset form when user changes or when editing is cancelled
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        date_of_birth: user.date_of_birth?.split('T')[0] || '' // Format for date input
      })
    }
  }, [user, isEditing])

  // Clear message after 5 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' })
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (formData.phone && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Phone number is invalid'
    }

    if (formData.date_of_birth) {
      const birthDate = new Date(formData.date_of_birth)
      const today = new Date()
      if (birthDate > today) {
        newErrors.date_of_birth = 'Birth date cannot be in the future'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Please fix the errors in the form' })
      return
    }

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const response = await userService.updateProfile(formData)
      updateUser(response.user)
      setIsEditing(false)
      setMessage({ 
        type: 'success', 
        text: 'Profile updated successfully!' 
      })
    } catch (error) {
      console.error('Failed to update profile:', error)
      const errorMessage = error.response?.data?.error || 'Failed to update profile. Please try again.'
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      date_of_birth: user.date_of_birth?.split('T')[0] || ''
    })
    setErrors({})
    setMessage({ type: '', text: '' })
    setIsEditing(false)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Required</h2>
          <p className="text-gray-600">Please log in to view your profile</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden py-8">
      {/* Modern Background with Patterns */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-900 via-cyan-800 to-blue-900 -z-20"></div>
      
      {/* Animated Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-20 -z-10"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 35%, rgba(20, 184, 166, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 75% 65%, rgba(6, 182, 212, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
            linear-gradient(135deg, rgba(255, 255, 255, 0.02) 25%, transparent 25%),
            linear-gradient(225deg, rgba(255, 255, 255, 0.02) 25%, transparent 25%),
            linear-gradient(45deg, rgba(255, 255, 255, 0.02) 25%, transparent 25%),
            linear-gradient(315deg, rgba(255, 255, 255, 0.02) 25%, transparent 25%)
          `,
          backgroundSize: '100% 100%, 100% 100%, 100% 100%, 80px 80px, 80px 80px, 80px 80px, 80px 80px',
          backgroundPosition: '0 0, 0 0, 0 0, 0 0, 40px 0, 40px 40px, 0 40px'
        }}
      ></div>
      
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent -z-10"></div>
      
      {/* Decorative elements */}
      <div className="absolute top-20 right-20 opacity-10 animate-pulse">
        <User className="h-40 w-40 text-white" />
      </div>
      <div className="absolute bottom-20 left-20 opacity-10 animate-pulse" style={{ animationDelay: '700ms' }}>
        <Shield className="h-32 w-32 text-white" />
      </div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5 animate-pulse" style={{ animationDelay: '1400ms' }}>
        <Mail className="h-48 w-48 text-white" />
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Message Alert */}
        {message.text && (
          <div className={`mb-6 p-5 rounded-xl border backdrop-blur-lg shadow-2xl transform hover:scale-[1.02] transition-all duration-300 ${
            message.type === 'error' 
              ? 'bg-red-50/95 border-red-300 text-red-800'
              : 'bg-green-50/95 border-green-300 text-green-800'
          }`}>
            <div className="flex items-center">
              {message.type === 'error' ? (
                <AlertCircle className="h-5 w-5 mr-2" />
              ) : (
                <CheckCircle className="h-5 w-5 mr-2" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          </div>
        )}

        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-indigo-600">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">Profile Information 👤</h1>
                <p className="text-white/90 mt-1 drop-shadow-md">Manage your personal information and preferences</p>
              </div>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center px-5 py-3 text-sm font-medium text-white bg-white/20 backdrop-blur-md border border-white/30 rounded-xl hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex space-x-3">
                  <button
                    onClick={handleCancel}
                    className="flex items-center px-5 py-3 text-sm font-medium text-white bg-white/20 backdrop-blur-md border border-white/30 rounded-xl hover:bg-white/30 transition-all duration-300 shadow-lg"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center px-5 py-3 text-sm font-medium text-indigo-600 bg-white rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-6">
            {/* User Avatar and Basic Info */}
            <div className="flex items-start space-x-6 mb-8">
              <div className="relative">
                <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300">
                  <User className="h-12 w-12 text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2 shadow-lg animate-pulse">
                  <Shield className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900 mb-1">{user.name}</h2>
                <p className="text-gray-600 mb-3 text-lg">{user.email}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
                    {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                  </span>
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg">
                    ✓ Verified Account
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Name Field */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <User className="h-4 w-4 mr-2" />
                    Full Name
                  </label>
                  {isEditing ? (
                    <div>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                          errors.name ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter your full name"
                        required
                      />
                      {errors.name && (
                        <p className="text-red-600 text-sm mt-1 flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {errors.name}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-900 text-lg font-medium px-1">{user.name}</p>
                  )}
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Address
                  </label>
                  {isEditing ? (
                    <div>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                          errors.email ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="your.email@example.com"
                        required
                      />
                      {errors.email && (
                        <p className="text-red-600 text-sm mt-1 flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {errors.email}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-900 text-lg font-medium px-1">{user.email}</p>
                  )}
                </div>

                {/* Phone Field */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <Phone className="h-4 w-4 mr-2" />
                    Phone Number
                  </label>
                  {isEditing ? (
                    <div>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                          errors.phone ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="+1 (555) 123-4567"
                      />
                      {errors.phone && (
                        <p className="text-red-600 text-sm mt-1 flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {errors.phone}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-900 text-lg font-medium px-1">
                      {user.phone || <span className="text-gray-400">Not provided</span>}
                    </p>
                  )}
                </div>

                {/* Date of Birth Field */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <Calendar className="h-4 w-4 mr-2" />
                    Date of Birth
                  </label>
                  {isEditing ? (
                    <div>
                      <input
                        type="date"
                        name="date_of_birth"
                        value={formData.date_of_birth}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
                          errors.date_of_birth ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.date_of_birth && (
                        <p className="text-red-600 text-sm mt-1 flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {errors.date_of_birth}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-900 text-lg font-medium px-1">
                      {user.date_of_birth ? formatDate(user.date_of_birth) : <span className="text-gray-400">Not provided</span>}
                    </p>
                  )}
                </div>

                {/* Address Field - Full Width */}
                <div className="lg:col-span-2 space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <MapPin className="h-4 w-4 mr-2" />
                    Address
                  </label>
                  {isEditing ? (
                    <div>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 resize-none"
                        placeholder="Enter your complete address"
                      />
                    </div>
                  ) : (
                    <p className="text-gray-900 text-lg font-medium px-1">
                      {user.address || <span className="text-gray-400">Not provided</span>}
                    </p>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerProfile