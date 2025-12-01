import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth.jsx'; 
import { userService } from '../../services/userService'
import { User, Mail, Phone, MapPin, Calendar, Edit, Save, X, Camera, Shield, Star, Gift, TrendingUp, Award } from 'lucide-react'
import api from '../../services/api'

const SharedProfile = () => {
  const { user, updateUser } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loyaltyData, setLoyaltyData] = useState(null)
  const [loadingLoyalty, setLoadingLoyalty] = useState(true)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordError, setPasswordError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: ''
  })

  // Fetch loyalty data and refresh user data
  useEffect(() => {
    if (user && user.role === 'customer') {
      fetchLoyaltyData()
      refreshUserData()
    }
  }, [user?.id]) // Only run when user ID changes

  const fetchLoyaltyData = async () => {
    try {
      setLoadingLoyalty(true)
      const response = await api.get('/api/loyalty/benefits')
      setLoyaltyData(response.data)
    } catch (error) {
      console.error('Error fetching loyalty data:', error)
    } finally {
      setLoadingLoyalty(false)
    }
  }

  const refreshUserData = async () => {
    try {
      const response = await api.get('/auth/me')
      if (response.data) {
        // Update the user in auth context with fresh data
        updateUser(response.data)
      }
    } catch (error) {
      console.error('Error refreshing user data:', error)
    }
  }

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        date_of_birth: user.date_of_birth || ''
      })
    }
  }, [user])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('📝 Updating profile with data:', formData)
      const response = await api.put('/auth/profile', formData)
      
      if (response.data) {
        console.log('✅ Profile updated successfully:', response.data)
        updateUser(response.data)
        setIsEditing(false)
        alert('Profile updated successfully!')
      }
    } catch (error) {
      console.error('❌ Failed to update profile:', error)
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to update profile. Please try again.'
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
      date_of_birth: user?.date_of_birth || ''
    })
    setIsEditing(false)
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordError('')

    // Validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long')
      return
    }

    try {
      setLoading(true)
      const response = await api.post('/auth/change-password', {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      })

      if (response.data.success) {
        alert('Password changed successfully!')
        setShowPasswordModal(false)
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      }
    } catch (error) {
      console.error('Failed to change password:', error)
      setPasswordError(error.response?.data?.error || 'Failed to change password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadge = () => {
    const roleConfig = {
      admin: { label: 'Admin', gradient: 'from-red-500 to-pink-500', icon: '👑' },
      operator: { label: 'Operator', gradient: 'from-purple-500 to-indigo-500', icon: '⚙️' },
      driver: { label: 'Driver', gradient: 'from-blue-500 to-cyan-500', icon: '🚗' },
      customer: { label: 'Customer', gradient: 'from-green-500 to-emerald-500', icon: '👤' }
    }
    
    const config = roleConfig[user?.role] || { label: user?.role, gradient: 'from-gray-500 to-slate-500', icon: '👤' }
    return (
      <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${config.gradient} shadow-lg border-2 border-white/50`}>
        <span className="mr-1.5">{config.icon}</span>
        {config.label}
      </span>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Please log in to view your profile</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl overflow-hidden mb-8">
          <div className="px-8 py-6 relative">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
            
            <div className="relative flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
                <p className="text-indigo-100">Manage your account information and preferences</p>
              </div>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center px-6 py-3 text-sm font-semibold text-indigo-600 bg-white rounded-xl hover:bg-indigo-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Edit className="h-5 w-5 mr-2" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex space-x-3">
                  <button
                    onClick={handleCancel}
                    className="flex items-center px-6 py-3 text-sm font-semibold text-white bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all duration-200"
                  >
                    <X className="h-5 w-5 mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center px-6 py-3 text-sm font-semibold text-indigo-600 bg-white rounded-xl hover:bg-indigo-50 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Save className="h-5 w-5 mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              {/* Profile Header */}
              <div className="p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                <div className="flex items-center space-x-6">
                  <div className="relative group">
                    <div className="w-28 h-28 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl transform transition-transform group-hover:scale-105">
                      <User className="h-14 w-14 text-white" />
                    </div>
                    {isEditing && (
                      <button className="absolute bottom-0 right-0 p-2.5 bg-white text-blue-600 rounded-xl hover:bg-blue-50 shadow-lg transform transition-all hover:scale-110">
                        <Camera className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{user.name}</h2>
                    <p className="text-gray-600 mb-3">{user.email}</p>
                    <div className="flex items-center space-x-2">
                      {getRoleBadge()}
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                        <Shield className="h-3 w-3 mr-1" />
                        Verified Account
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-8">
                <div className="space-y-8">
                  {/* Personal Information Section */}
                  <div>
                    <div className="flex items-center mb-6">
                      <div className="flex-1 border-t-2 border-blue-200"></div>
                      <h3 className="px-4 text-lg font-bold text-gray-900 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Personal Information
                      </h3>
                      <div className="flex-1 border-t-2 border-blue-200"></div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      <div>
                        <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                          <User className="h-4 w-4 mr-2 text-blue-600" />
                          Full Name
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            required
                          />
                        ) : (
                          <p className="text-gray-900 font-medium px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">{user.name}</p>
                        )}
                      </div>

                      <div>
                        <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                          <Mail className="h-4 w-4 mr-2 text-blue-600" />
                          Email Address
                        </label>
                        {isEditing ? (
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            required
                          />
                        ) : (
                          <p className="text-gray-900 font-medium px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">{user.email}</p>
                        )}
                      </div>

                      <div>
                        <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                          <Phone className="h-4 w-4 mr-2 text-blue-600" />
                          Phone Number
                        </label>
                        {isEditing ? (
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          />
                        ) : (
                          <p className="text-gray-900 font-medium px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">{user.phone || 'Not provided'}</p>
                        )}
                      </div>

                      <div>
                        <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                          <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                          Date of Birth
                        </label>
                        {isEditing ? (
                          <input
                            type="date"
                            name="date_of_birth"
                            value={formData.date_of_birth}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          />
                        ) : (
                          <p className="text-gray-900 font-medium px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                            {user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : 'Not provided'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div>
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                      Address
                    </label>
                    {isEditing ? (
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">{user.address || 'Not provided'}</p>
                    )}
                  </div>

                  {/* Account Information Section */}
                  <div>
                    <div className="flex items-center mb-6">
                      <div className="flex-1 border-t-2 border-blue-200"></div>
                      <h3 className="px-4 text-lg font-bold text-gray-900 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Account Information
                      </h3>
                      <div className="flex-1 border-t-2 border-blue-200"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200 shadow-sm">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Member Since
                        </label>
                        <p className="text-xl font-bold text-blue-600">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-200 shadow-sm">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Last Updated
                        </label>
                        <p className="text-xl font-bold text-indigo-600">
                          {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Stats */}
                  {user.role === 'customer' && (
                    <div>
                      <div className="flex items-center mb-6">
                        <div className="flex-1 border-t-2 border-blue-200"></div>
                        <h3 className="px-4 text-lg font-bold text-gray-900 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                          Travel Statistics
                        </h3>
                        <div className="flex-1 border-t-2 border-blue-200"></div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-xl border-2 border-emerald-200 shadow-md transform transition-all hover:scale-105 hover:shadow-lg">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-semibold text-gray-700">
                              Total Bookings
                            </label>
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                          </div>
                          <p className="text-3xl font-bold text-emerald-600">{user.total_bookings || 0}</p>
                          <p className="text-xs text-gray-600 mt-1">Lifetime trips</p>
                        </div>

                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border-2 border-amber-200 shadow-md transform transition-all hover:scale-105 hover:shadow-lg">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-semibold text-gray-700">
                              Loyalty Points
                            </label>
                            <Star className="h-5 w-5 text-amber-600" />
                          </div>
                          <p className="text-3xl font-bold text-amber-600">{user.loyalty_points || loyaltyData?.loyalty_points || 0}</p>
                          <p className="text-xs text-gray-600 mt-1">Reward points earned</p>
                        </div>
                      </div>
                    </div>
                  )}

                {user.role === 'driver' && (
                  <div className="md:col-span-2 mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                      Driver Information
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          License Number
                        </label>
                        <p className="text-gray-900">{user.driver_info?.license_number || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Experience
                        </label>
                        <p className="text-gray-900">{user.driver_info?.experience || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Assigned Bus
                        </label>
                        <p className="text-gray-900">{user.driver_info?.assigned_bus || 'Not assigned'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>

            {/* Security Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-red-50 to-orange-50 px-8 py-6 border-b-2 border-red-100">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <Shield className="h-6 w-6 mr-3 text-red-600" />
                  Security Settings
                </h3>
              </div>
              <div className="p-8">
                <div className="flex items-center justify-between p-6 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border-2 border-gray-200">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Password
                    </label>
                    <p className="text-2xl font-bold text-gray-400 tracking-wider">••••••••</p>
                  </div>
                  <button 
                    onClick={() => setShowPasswordModal(true)}
                    className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-orange-500 rounded-xl hover:from-red-600 hover:to-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Quick Stats */}
          <div className="space-y-6">
            {/* Quick Info Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 px-6 py-8 text-white">
                <h3 className="text-lg font-bold mb-4">Quick Info</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-100">Account Type</p>
                      <p className="font-semibold capitalize">{user.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-100">Joined</p>
                      <p className="font-semibold">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-100">Status</p>
                      <p className="font-semibold">Active & Verified</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Loyalty Preview Card */}
            {user.role === 'customer' && (
              <div className="bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Loyalty Status</h3>
                  <Award className="h-8 w-8" />
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-white/80">Current Tier</p>
                    <p className="text-2xl font-bold capitalize">{user.loyalty_tier || 'Member'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/80">Total Points</p>
                    <p className="text-3xl font-bold">{user.loyalty_points || 0}</p>
                  </div>
                  <div className="pt-3 border-t border-white/30">
                    <p className="text-xs text-white/80">Next Tier: Bronze (500 pts)</p>
                    <div className="mt-2 w-full bg-white/30 rounded-full h-2">
                      <div 
                        className="bg-white h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(((user.loyalty_points || 0) / 500) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loyalty Program Section - Only for customers */}
        {user.role === 'customer' && (
          <div className="mt-6">
            {/* Loyalty Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">🎁 Loyalty Rewards</h2>
                  <p className="text-indigo-100">Earn points, unlock benefits, and enjoy exclusive perks</p>
                </div>
                {loyaltyData && (
                  <div className="text-right">
                    <p className="text-indigo-100 text-sm">Your Points</p>
                    <p className="text-4xl font-bold">{loyaltyData.loyalty_points?.toLocaleString() || 0}</p>
                  </div>
                )}
              </div>
            </div>

            {loadingLoyalty ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading loyalty information...</p>
              </div>
            ) : loyaltyData ? (
              <>
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-indigo-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm font-medium mb-1">Current Tier</p>
                        <p className="text-2xl font-bold text-gray-900 capitalize">{loyaltyData.tier}</p>
                      </div>
                      <div className="text-4xl">{loyaltyData.benefits?.icon || '👤'}</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm font-medium mb-1">Discount</p>
                        <p className="text-2xl font-bold text-green-600">{loyaltyData.benefits?.discount_percentage || 0}%</p>
                      </div>
                      <TrendingUp className="w-10 h-10 text-green-500" />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm font-medium mb-1">Free Trips</p>
                        <p className="text-2xl font-bold text-purple-600">{loyaltyData.free_trips_remaining || 0}</p>
                        <p className="text-xs text-gray-500">remaining this year</p>
                      </div>
                      <Gift className="w-10 h-10 text-purple-500" />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm font-medium mb-1">Referrals</p>
                        <p className="text-2xl font-bold text-yellow-600">{loyaltyData.total_referrals || 0}</p>
                      </div>
                      <Award className="w-10 h-10 text-yellow-500" />
                    </div>
                  </div>
                </div>

                {/* Tier Progress */}
                {loyaltyData.progress?.next_tier && (
                  <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Progress to {loyaltyData.progress.next_tier} Tier</h3>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-gray-600">Current: {loyaltyData.loyalty_points?.toLocaleString()} points</span>
                      <span className="text-indigo-600 font-semibold">{loyaltyData.progress.points_to_next?.toLocaleString()} points to go</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 h-4 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(loyaltyData.progress.progress_percentage || 0, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* How to Earn Points */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Star className="w-6 h-6 text-yellow-500" />
                    How to Earn Points
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-3xl mb-2">🎫</div>
                      <p className="font-semibold text-gray-900 mb-1">Book a Trip</p>
                      <p className="text-2xl font-bold text-blue-600">+100</p>
                      <p className="text-xs text-gray-600">points per booking</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-3xl mb-2">✅</div>
                      <p className="font-semibold text-gray-900 mb-1">Complete Trip</p>
                      <p className="text-2xl font-bold text-green-600">+50</p>
                      <p className="text-xs text-gray-600">bonus points</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="text-3xl mb-2">👥</div>
                      <p className="font-semibold text-gray-900 mb-1">Refer Friends</p>
                      <p className="text-2xl font-bold text-purple-600">+{loyaltyData.benefits?.referral_bonus_points || 0}</p>
                      <p className="text-xs text-gray-600">per referral</p>
                    </div>
                    <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                      <div className="text-3xl mb-2">🎂</div>
                      <p className="font-semibold text-gray-900 mb-1">Birthday Gift</p>
                      <p className="text-2xl font-bold text-pink-600">+{loyaltyData.benefits?.birthday_bonus_points || 0}</p>
                      <p className="text-xs text-gray-600">once per year</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <p className="text-gray-600">Unable to load loyalty information</p>
                <button
                  onClick={fetchLoyaltyData}
                  className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                  setPasswordError('')
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>

              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center mr-4">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Change Password</h2>
              </div>

              {passwordError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{passwordError}</p>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 placeholder-gray-400"
                    required
                  />
                </div>

                <div>
                  <input
                    type="password"
                    placeholder="Enter new password (min. 6 characters)"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 placeholder-gray-400"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 placeholder-gray-400"
                    required
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false)
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                      setPasswordError('')
                    }}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold rounded-xl hover:from-red-600 hover:to-orange-600 disabled:opacity-50 transition-all duration-200 shadow-lg"
                  >
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SharedProfile