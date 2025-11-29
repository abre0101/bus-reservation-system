import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'

const DriverProfile = () => {
  const { user, updateUser } = useAuth()
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    license_number: '',
    license_expiry: ''
  })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState({
    totalTrips: 0,
    completedTrips: 0,
    totalPassengers: 0,
    rating: 0
  })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || user.name || '',
        email: user.email || '',
        phone_number: user.phone_number || user.phone || '',
        license_number: user.license_number || '',
        license_expiry: user.license_expiry || ''
      })
    }
    fetchStats()
  }, [user])

  const fetchStats = async () => {
    try {
      setLoadingStats(true)
      // Fetch dashboard stats and trips to calculate performance
      const [dashboardRes, tripsRes] = await Promise.all([
        api.get('/driver/dashboard/stats'),
        api.get('/driver/trips?status=all')
      ])
      
      const dashboardData = dashboardRes.data
      const allTrips = tripsRes.data.trips || []
      
      // Calculate stats
      const completedTrips = allTrips.filter(t => t.status === 'completed' || t.status === 'arrived').length
      const totalPassengers = allTrips.reduce((sum, trip) => sum + (trip.passenger_count || 0), 0)
      
      setStats({
        totalTrips: allTrips.length,
        completedTrips: completedTrips,
        totalPassengers: totalPassengers,
        rating: 4.5 // Placeholder - can be calculated from reviews later
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const response = await api.put('/driver/profile', formData)
      updateUser(response.data.user)
      setEditing(false)
      alert('Profile updated successfully!')
    } catch (error) {
      alert('Error updating profile: ' + (error.response?.data?.error || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>

          <div className="flex items-center space-x-6 mb-6">
            <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-4xl font-bold">
              {(user?.full_name || user?.name)?.charAt(0) || 'D'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user?.full_name || user?.name}</h2>
              <p className="text-gray-600">{user?.email}</p>
              <p className="text-sm text-blue-600 font-medium mt-1">Driver</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  disabled={!editing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!editing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  disabled={!editing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                <input
                  type="text"
                  name="license_number"
                  value={formData.license_number}
                  onChange={handleChange}
                  disabled={!editing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">License Expiry</label>
                <input
                  type="date"
                  name="license_expiry"
                  value={formData.license_expiry}
                  onChange={handleChange}
                  disabled={!editing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>

            {editing && (
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Performance Stats</h2>
          {loadingStats ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading stats...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-100 hover:border-blue-300 transition-all">
                <div className="text-4xl mb-2">🚌</div>
                <p className="text-3xl font-bold text-blue-600">{stats.totalTrips}</p>
                <p className="text-gray-600 text-sm mt-1">Total Trips</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-100 hover:border-green-300 transition-all">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-3xl font-bold text-green-600">{stats.completedTrips}</p>
                <p className="text-gray-600 text-sm mt-1">Completed</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border-2 border-purple-100 hover:border-purple-300 transition-all">
                <div className="text-4xl mb-2">👥</div>
                <p className="text-3xl font-bold text-purple-600">{stats.totalPassengers}</p>
                <p className="text-gray-600 text-sm mt-1">Passengers</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-100 hover:border-yellow-300 transition-all">
                <div className="text-4xl mb-2">⭐</div>
                <p className="text-3xl font-bold text-yellow-600">{stats.rating.toFixed(1)}</p>
                <p className="text-gray-600 text-sm mt-1">Rating</p>
              </div>
            </div>
          )}
        </div>
      </div>
   

  )
}

export default DriverProfile
