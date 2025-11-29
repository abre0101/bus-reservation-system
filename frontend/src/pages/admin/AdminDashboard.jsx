import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import api from '../../services/api'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState('today') // today, week, month, all
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDrivers: 0,
    totalBuses: 0,
    activeBuses: 0,
    totalRoutes: 0,
    totalSchedules: 0,
    todaySchedules: 0,
    totalBookings: 0,
    todayBookings: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    pendingBookings: 0,
    confirmedBookings: 0
  })
  const [recentBookings, setRecentBookings] = useState([])
  const [recentUsers, setRecentUsers] = useState([])
  const [upcomingSchedules, setUpcomingSchedules] = useState([])
  const [busStatus, setBusStatus] = useState({ active: 0, maintenance: 0, inactive: 0 })

  useEffect(() => {
    fetchDashboardData()
  }, [timeFilter])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch all data using adminService with fallback
      const fetchWithFallback = async (fetchFn, entityName, entityKey) => {
        try {
          const data = await fetchFn()
          console.log(`✅ ${entityName}:`, data)
          // Handle both array responses and object responses with entity key
          if (Array.isArray(data)) {
            return data
          } else if (data && data[entityKey]) {
            return data[entityKey]
          } else if (data && typeof data === 'object') {
            // Try to find an array in the response
            const keys = Object.keys(data)
            for (const key of keys) {
              if (Array.isArray(data[key])) {
                return data[key]
              }
            }
          }
          return []
        } catch (error) {
          console.warn(`⚠️ Failed to fetch ${entityName}:`, error.message)
          return []
        }
      }

      const [
        users,
        drivers,
        buses,
        routes,
        schedules,
        bookings,
        payments
      ] = await Promise.all([
        fetchWithFallback(() => adminService.getUsers(), 'users', 'users'),
        fetchWithFallback(() => adminService.getDrivers(), 'drivers', 'drivers'),
        fetchWithFallback(() => adminService.getBuses(), 'buses', 'buses'),
        fetchWithFallback(() => adminService.getRoutes(), 'routes', 'routes'),
        fetchWithFallback(() => adminService.getSchedules(), 'schedules', 'schedules'),
        fetchWithFallback(() => adminService.getBookings(), 'bookings', 'bookings'),
        fetchWithFallback(() => adminService.getPayments(), 'payments', 'payments')
      ])

      console.log('📊 Dashboard Data Counts:', {
        users: users.length,
        drivers: drivers.length,
        buses: buses.length,
        routes: routes.length,
        schedules: schedules.length,
        bookings: bookings.length,
        payments: payments.length
      })

      // Calculate date ranges
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Filter data based on time period
      const filterByDate = (item) => {
        const itemDate = item.created_at || item.travel_date || item.departure_date || item.departure_date
        if (!itemDate) return false
        
        const dateStr = itemDate.toString().split('T')[0]
        
        if (timeFilter === 'today') return dateStr === today
        if (timeFilter === 'week') return dateStr >= weekAgo
        if (timeFilter === 'month') return dateStr >= monthAgo
        return true // 'all'
      }

      // FIXED: For schedules, filter by departure_date instead of created_at
      const filterSchedulesByDate = (schedule) => {
        const scheduleDate = schedule.departure_date || schedule.departure_date
        if (!scheduleDate) return false
        
        const dateStr = scheduleDate.toString().split('T')[0]
        
        if (timeFilter === 'today') return dateStr === today
        if (timeFilter === 'week') return dateStr >= weekAgo
        if (timeFilter === 'month') return dateStr >= monthAgo
        return true // 'all'
      }

      const filteredSchedules = schedules.filter(filterSchedulesByDate)
      const filteredBookings = bookings.filter(filterByDate)
      const filteredPayments = payments.filter(p => {
        if (!p.created_at) return false
        const dateStr = p.created_at.toString().split('T')[0]
        if (timeFilter === 'today') return dateStr === today
        if (timeFilter === 'week') return dateStr >= weekAgo
        if (timeFilter === 'month') return dateStr >= monthAgo
        return true
      })

      const filteredUsers = users.filter(u => {
        if (!u.created_at) return timeFilter === 'all'
        const dateStr = u.created_at.toString().split('T')[0]
        if (timeFilter === 'today') return dateStr === today
        if (timeFilter === 'week') return dateStr >= weekAgo
        if (timeFilter === 'month') return dateStr >= monthAgo
        return true
      })
      
      const totalRevenue = filteredPayments
        .filter(p => p.status === 'success')
        .reduce((sum, p) => sum + (p.amount || 0), 0)
      
      const todayRevenue = payments
        .filter(p => p.status === 'success' && p.created_at?.toString().includes(today))
        .reduce((sum, p) => sum + (p.amount || 0), 0)

      const busStatusData = {
        active: buses.filter(b => b.status === 'active').length,
        maintenance: buses.filter(b => b.status === 'maintenance').length,
        inactive: buses.filter(b => b.status === 'inactive').length
      }

      setStats({
        totalUsers: timeFilter === 'all' ? users.length : filteredUsers.length,
        totalDrivers: drivers.length,
        totalBuses: buses.length,
        activeBuses: busStatusData.active,
        totalRoutes: routes.length,
        totalSchedules: timeFilter === 'all' ? schedules.length : filteredSchedules.length,
        todaySchedules: schedules.filter(s => {
          const dateStr = (s.departure_date || s.departure_date)?.toString().split('T')[0]
          return dateStr === today
        }).length,
        totalBookings: timeFilter === 'all' ? bookings.length : filteredBookings.length,
        todayBookings: bookings.filter(b => {
          const dateStr = (b.created_at || b.travel_date)?.toString().split('T')[0]
          return dateStr === today
        }).length,
        totalRevenue,
        todayRevenue,
        pendingBookings: filteredBookings.filter(b => b.status === 'pending').length,
        confirmedBookings: filteredBookings.filter(b => b.status === 'confirmed').length
      })

      setBusStatus(busStatusData)
      setRecentBookings(filteredBookings.slice(0, 5))
      setRecentUsers(filteredUsers.slice(0, 5))
      setUpcomingSchedules(filteredSchedules.slice(0, 5))

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ icon, label, value, subValue, color, onClick }) => (
    <div 
      onClick={onClick}
      className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${color} ${onClick ? 'cursor-pointer hover:shadow-lg' : ''} transition-shadow`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-600 text-sm font-medium mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subValue && <p className="text-sm text-gray-500 mt-1">{subValue}</p>}
        </div>
        <div className="text-5xl opacity-20">{icon}</div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section with Time Filter */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome to Admin Dashboard</h1>
            <p className="text-indigo-100">Here's what's happening with your bus system</p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="flex bg-white bg-opacity-20 rounded-lg p-1 space-x-1">
              {[
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
                { value: 'all', label: 'All Time' }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setTimeFilter(filter.value)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    timeFilter === filter.value
                      ? 'bg-white text-indigo-600 shadow-md'
                      : 'text-white hover:bg-white hover:bg-opacity-10'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon="👥"
          label={
            timeFilter === 'all' ? 'Total Users' :
            timeFilter === 'today' ? 'New Users Today' :
            timeFilter === 'week' ? 'New Users This Week' :
            'New Users This Month'
          }
          value={stats.totalUsers}
          subValue={`${stats.totalDrivers} drivers in system`}
          color="border-blue-500"
          onClick={() => navigate('/admin/users')}
        />
        <StatCard
          icon="🚌"
          label="Bus Fleet"
          value={stats.totalBuses}
          subValue={`${stats.activeBuses} active, ${stats.totalBuses - stats.activeBuses} inactive`}
          color="border-green-500"
          onClick={() => navigate('/admin/buses')}
        />
        <StatCard
          icon="🎫"
          label={
            timeFilter === 'all' ? 'Total Bookings' :
            timeFilter === 'today' ? 'Bookings Today' :
            timeFilter === 'week' ? 'Bookings This Week' :
            'Bookings This Month'
          }
          value={stats.totalBookings}
          subValue={timeFilter === 'today' ? `${stats.pendingBookings} pending, ${stats.confirmedBookings} confirmed` : `${stats.todayBookings} today`}
          color="border-purple-500"
          onClick={() => navigate('/admin/bookings')}
        />
        <StatCard
          icon="💰"
          label={
            timeFilter === 'all' ? 'Total Revenue' :
            timeFilter === 'today' ? 'Revenue Today' :
            timeFilter === 'week' ? 'Revenue This Week' :
            'Revenue This Month'
          }
          value={`${stats.totalRevenue.toLocaleString()} ETB`}
          subValue={timeFilter === 'today' ? `from ${stats.totalBookings} bookings` : `${stats.todayRevenue.toLocaleString()} ETB today`}
          color="border-yellow-500"
          onClick={() => navigate('/admin/payments')}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon="🗺️"
          label="Active Routes"
          value={stats.totalRoutes}
          subValue="total routes available"
          color="border-orange-500"
          onClick={() => navigate('/admin/routes')}
        />
        <StatCard
          icon="📅"
          label={
            timeFilter === 'all' ? 'Total Schedules' :
            timeFilter === 'today' ? 'Departures Today' :
            timeFilter === 'week' ? 'Departures This Week' :
            'Departures This Month'
          }
          value={stats.totalSchedules}
          subValue={timeFilter === 'today' ? `${stats.todaySchedules} trips scheduled` : `${stats.todaySchedules} departing today`}
          color="border-teal-500"
          onClick={() => navigate('/admin/schedules')}
        />
        <StatCard
          icon="⏳"
          label={
            timeFilter === 'all' ? 'Pending Bookings' :
            timeFilter === 'today' ? 'Pending Today' :
            timeFilter === 'week' ? 'Pending This Week' :
            'Pending This Month'
          }
          value={stats.pendingBookings}
          subValue="awaiting confirmation"
          color="border-red-500"
          onClick={() => navigate('/admin/bookings')}
        />
        <StatCard
          icon="✅"
          label={
            timeFilter === 'all' ? 'Confirmed Bookings' :
            timeFilter === 'today' ? 'Confirmed Today' :
            timeFilter === 'week' ? 'Confirmed This Week' :
            'Confirmed This Month'
          }
          value={stats.confirmedBookings}
          subValue="ready to travel"
          color="border-green-500"
          onClick={() => navigate('/admin/bookings')}
        />
      </div>

      {/* Bus Status Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Bus Fleet Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Buses</p>
                <p className="text-2xl font-bold text-green-600">{busStatus.active}</p>
              </div>
              <div className="text-4xl">🟢</div>
            </div>
            <div className="mt-2 bg-green-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${(busStatus.active / stats.totalBuses) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Under Maintenance</p>
                <p className="text-2xl font-bold text-yellow-600">{busStatus.maintenance}</p>
              </div>
              <div className="text-4xl">🟡</div>
            </div>
            <div className="mt-2 bg-yellow-200 rounded-full h-2">
              <div 
                className="bg-yellow-600 h-2 rounded-full" 
                style={{ width: `${(busStatus.maintenance / stats.totalBuses) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactive Buses</p>
                <p className="text-2xl font-bold text-red-600">{busStatus.inactive}</p>
              </div>
              <div className="text-4xl">🔴</div>
            </div>
            <div className="mt-2 bg-red-200 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full" 
                style={{ width: `${(busStatus.inactive / stats.totalBuses) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Bookings</h2>
            <button
              onClick={() => navigate('/admin/bookings')}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              View All →
            </button>
          </div>
          {recentBookings.length > 0 ? (
            <div className="space-y-3">
              {recentBookings.map((booking) => (
                <div key={booking._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{booking.passenger_name}</p>
                    <p className="text-sm text-gray-600">
                      {booking.departure_city} → {booking.arrival_city}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{booking.total_amount} ETB</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No recent bookings</p>
          )}
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Users</h2>
            <button
              onClick={() => navigate('/admin/users')}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              View All →
            </button>
          </div>
          {recentUsers.length > 0 ? (
            <div className="space-y-3">
              {recentUsers.map((user) => (
                <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 font-semibold">
                        {(user.name || user.email)?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{user.name || user.full_name}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'driver' ? 'bg-blue-100 text-blue-800' :
                    user.role === 'operator' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No recent users</p>
          )}
        </div>
      </div>

      {/* Upcoming Schedules */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Upcoming Schedules</h2>
          <button
            onClick={() => navigate('/admin/schedules')}
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
          >
            View All →
          </button>
        </div>
        {upcomingSchedules.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Route</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Time</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Bus</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Seats</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {upcomingSchedules.map((schedule) => (
                  <tr key={schedule._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {schedule.originCity || schedule.route?.origin} → {schedule.destinationCity || schedule.route?.destination}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {schedule.departure_date || schedule.departure_date?.toString().split('T')[0]}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {schedule.departureTime || schedule.departure_time}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {schedule.busNumber || schedule.bus?.bus_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {schedule.booked_seats || schedule.bookedSeats || 0} / {schedule.totalSeats || schedule.availableSeats}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        schedule.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        schedule.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {schedule.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No upcoming schedules</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <span className="text-3xl mb-2">👥</span>
            <span className="text-sm font-medium text-gray-900">Manage Users</span>
          </button>
          <button
            onClick={() => navigate('/admin/buses')}
            className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <span className="text-3xl mb-2">🚌</span>
            <span className="text-sm font-medium text-gray-900">Manage Buses</span>
          </button>
          <button
            onClick={() => navigate('/admin/schedules')}
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <span className="text-3xl mb-2">📅</span>
            <span className="text-sm font-medium text-gray-900">Manage Schedules</span>
          </button>
          <button
            onClick={() => navigate('/admin/reports')}
            className="flex flex-col items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
          >
            <span className="text-3xl mb-2">📊</span>
            <span className="text-sm font-medium text-gray-900">View Reports</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
