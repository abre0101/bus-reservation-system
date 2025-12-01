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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: ''
  })

  // Fetch loyalty data
  useEffect(() => {
    if (user && user.role === 'customer') {
      fetchLoyaltyData()
    }
  }, [user])

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
      const updatedUser = await userService.updateProfile(formData)
      updateUser(updatedUser)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('Failed to update profile. Please try again.')
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

  const getRoleBadge = () => {
    const roleConfig = {
      admin: { label: 'Admin', color: 'bg-red-100 text-red-800' },
      operator: { label: 'Operator', color: 'bg-purple-100 text-purple-800' },
      driver: { label: 'Driver', color: 'bg-blue-100 text-blue-800' },
      customer: { label: 'Customer', color: 'bg-green-100 text-green-800' }
    }
    
    const config = roleConfig[user?.role] || { label: user?.role, color: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-6">
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleCancel}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
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
            {/* Profile Header */}
            <div className="flex items-center space-x-6 mb-8">
              <div className="relative">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-12 w-12 text-blue-600" />
                </div>
                {isEditing && (
                  <button className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700">
                    <Camera className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
                <p className="text-gray-600">{user.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  {getRoleBadge()}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <Shield className="h-3 w-3 mr-1" />
                    Verified
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                    Personal Information
                  </h3>
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <User className="h-4 w-4 mr-2" />
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  ) : (
                    <p className="text-gray-900">{user.name}</p>
                  )}
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Address
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  ) : (
                    <p className="text-gray-900">{user.email}</p>
                  )}
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Phone className="h-4 w-4 mr-2" />
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{user.phone || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 mr-2" />
                    Date of Birth
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : 'Not provided'}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="h-4 w-4 mr-2" />
                    Address
                  </label>
                  {isEditing ? (
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{user.address || 'Not provided'}</p>
                  )}
                </div>

                {/* Account Information */}
                <div className="md:col-span-2 mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                    Account Information
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Member Since
                  </label>
                  <p className="text-gray-900">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Updated
                  </label>
                  <p className="text-gray-900">
                    {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                {/* Role-specific Information */}
                {user.role === 'customer' && (
                  <div className="md:col-span-2 mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                      Customer Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Total Bookings
                        </label>
                        <p className="text-gray-900">{user.stats?.total_bookings || 0}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Loyalty Points
                        </label>
                        <p className="text-gray-900">{user.stats?.loyalty_points || 0}</p>
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
        </div>

        {/* Security Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Security</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <p className="text-gray-900">••••••••</p>
            </div>
            <div className="flex items-end">
              <button className="text-blue-600 hover:text-blue-700 font-medium">
                Change Password
              </button>
            </div>
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
      </div>
    </div>
  )
}

export default SharedProfile