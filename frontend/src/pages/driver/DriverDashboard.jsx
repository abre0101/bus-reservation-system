import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Play, Eye } from 'lucide-react'
import { toast } from 'react-toastify'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'

const DriverDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    todayTrips: 0,
    activeTrip: null,
    completedTrips: 0,
    totalPassengers: 0
  })
  const [upcomingTrips, setUpcomingTrips] = useState([])
  const [filteredTrips, setFilteredTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [startingTrip, setStartingTrip] = useState(null)
  const [filter, setFilter] = useState('all') // all, today, week, month

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    fetchFilteredTrips()
  }, [filter])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch initial trips and stats
      await fetchFilteredTrips()
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchFilteredTrips = async () => {
    try {
      setLoading(true)
      
      // Calculate date range based on filter
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      let startDate = today
      let endDate = null

      if (filter === 'today') {
        endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      } else if (filter === 'week') {
        endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      } else if (filter === 'month') {
        endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      } else {
        // 'all' - get next 90 days
        endDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
      }

      // Format dates for API
      const startDateStr = startDate.toISOString()
      const endDateStr = endDate.toISOString()

      // Fetch trips with date range
      const response = await api.get('/driver/schedules', {
        params: {
          start_date: startDateStr,
          end_date: endDateStr
        }
      })

      const trips = response.data.schedules || []
      
      // Filter to only show scheduled and delayed trips (upcoming)
      const upcomingOnly = trips.filter(trip => 
        trip.status === 'scheduled' || trip.status === 'delayed'
      )
      
      // Calculate stats based on filtered trips
      const completedTrips = trips.filter(trip => 
        trip.status === 'completed' || trip.status === 'arrived'
      )
      
      const departedTrips = trips.filter(trip => 
        trip.status === 'departed' || trip.status === 'active'
      )
      
      // Calculate total passengers
      let totalPassengers = 0
      upcomingOnly.forEach(trip => {
        totalPassengers += trip.booked_seats || 0
      })
      
      // Find active trip
      const activeTrip = departedTrips.length > 0 ? departedTrips[0] : null
      
      // Update stats based on filter
      setStats({
        todayTrips: filter === 'today' ? upcomingOnly.length : trips.filter(t => {
          const tripDate = new Date(t.departure_date)
          return tripDate.toDateString() === today.toDateString()
        }).length,
        activeTrip: activeTrip ? {
          route: {
            origin: activeTrip.origin_city || activeTrip.route?.origin,
            destination: activeTrip.destination_city || activeTrip.route?.destination
          }
        } : null,
        completedTrips: completedTrips.length,
        totalPassengers: totalPassengers
      })
      
      setUpcomingTrips(upcomingOnly)
      setFilteredTrips(upcomingOnly)
    } catch (error) {
      console.error('Error fetching filtered trips:', error)
      toast.error('Failed to load trips')
    } finally {
      setLoading(false)
    }
  }

  const handleStartJourney = async (tripId) => {
    try {
      setStartingTrip(tripId)
      
      // First check if can start
      const checkResponse = await api.get(`/driver/trips/${tripId}/can-start`)
      
      if (!checkResponse.data.can_start) {
        toast.warning(checkResponse.data.message || 'Cannot start journey yet')
        return
      }
      
      // Start the journey
      await api.post(`/driver/trips/${tripId}/start`)
      toast.success('🚀 Journey started successfully!')
      
      // Navigate to active trip page
      navigate('/driver/active-trip')
    } catch (error) {
      console.error('Error starting journey:', error)
      toast.error(error.response?.data?.error || 'Failed to start journey')
    } finally {
      setStartingTrip(null)
    }
  }

  const StatCard = ({ icon, label, value, color }) => (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  )



  const formatTime = (time) => {
    if (!time) return 'N/A'
    return time.includes(':') ? time : `${time.substring(0, 2)}:${time.substring(2)}`
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const TripCard = ({ trip }) => (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-all border-l-4 border-blue-500">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900 mb-1">
            {trip.origin_city || trip.route?.origin || 'N/A'} → {trip.destination_city || trip.route?.destination || 'N/A'}
          </h3>
          <p className="text-xs text-gray-500">
            📅 {formatDate(trip.departure_date)}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
          trip.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
          trip.status === 'departed' ? 'bg-green-100 text-green-800' :
          trip.status === 'completed' ? 'bg-gray-100 text-gray-800' :
          trip.status === 'delayed' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {trip.status?.toUpperCase()}
        </span>
      </div>
      
      <div className="space-y-2 text-sm mb-4">
        <div className="flex items-center text-gray-700">
          <span className="mr-2">🕐</span>
          <span>Departure: {formatTime(trip.departure_time)}</span>
        </div>
        <div className="flex items-center text-gray-700">
          <span className="mr-2">🚌</span>
          <span>Bus: {
            trip.bus?.plate_number || 
            trip.bus?.bus_number || 
            trip.plate_number || 
            trip.bus_number || 
            trip.bus?.number || 
            'Not Assigned'
          }</span>
        </div>
        <div className="flex items-center text-gray-700">
          <span className="mr-2">👥</span>
          <span>Passengers: {trip.booked_seats || 0} / {trip.total_seats || trip.bus?.capacity || 45}</span>
        </div>
        {trip.estimated_duration && (
          <div className="flex items-center text-gray-700">
            <span className="mr-2">⏱️</span>
            <span>Duration: {trip.estimated_duration}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Link
          to={`/driver/trips/${trip.id || trip._id}`}
          className="w-full bg-blue-600 text-white py-2 rounded-lg text-center hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Eye className="w-4 h-4" />
          View Details
        </Link>
      </div>
    </div>
  )

  return (

      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.full_name || user?.name}! 👋
          </h1>
          <p className="text-gray-600">
            {filter === 'today' && "Here's your overview for today"}
            {filter === 'week' && "Here's your overview for this week"}
            {filter === 'month' && "Here's your overview for this month"}
            {filter === 'all' && "Here's your complete overview"}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon="🚌"
            label={
              filter === 'today' ? "Today's Trips" :
              filter === 'week' ? "This Week's Trips" :
              filter === 'month' ? "This Month's Trips" :
              "Total Trips"
            }
            value={filteredTrips.length}
            color="border-blue-500"
          />
          <StatCard
            icon="✅"
            label="Completed Trips"
            value={stats.completedTrips}
            color="border-green-500"
          />
          <StatCard
            icon="👥"
            label="Total Passengers"
            value={stats.totalPassengers}
            color="border-purple-500"
          />
          <StatCard
            icon="🎯"
            label="Active Trip"
            value={stats.activeTrip ? 'In Progress' : 'None'}
            color="border-orange-500"
          />
        </div>

        {/* Active Trip Alert */}
        {stats.activeTrip && (
          <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-1">
                  🚌 Active Trip in Progress
                </h3>
                <p className="text-green-700">
                  {stats.activeTrip.route?.origin} → {stats.activeTrip.route?.destination}
                </p>
              </div>
              <Link
                to="/driver/active-trip"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Manage Trip
              </Link>
            </div>
          </div>
        )}

        {/* Upcoming Trips */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-900">Upcoming Trips</h2>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Filter Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === 'all'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('today')}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === 'today'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Today
                </button>
                <button
                  onClick={() => setFilter('week')}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === 'week'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  This Week
                </button>
                <button
                  onClick={() => setFilter('month')}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === 'month'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  This Month
                </button>
              </div>
              <Link
                to="/driver/trips"
                className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
              >
                View All →
              </Link>
            </div>
          </div>

          {/* Results Count */}
          {!loading && upcomingTrips.length > 0 && (
            <div className="mb-4 text-sm text-gray-600">
              Showing {filteredTrips.length} of {upcomingTrips.length} trips
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading trips...</p>
            </div>
          ) : filteredTrips.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTrips.slice(0, 6).map((trip, index) => (
                <TripCard key={trip.id || trip._id || `trip-${index}`} trip={trip} />
              ))}
            </div>
          ) : upcomingTrips.length > 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-gray-600 text-lg">No trips found for this filter</p>
              <p className="text-gray-500 text-sm mt-2">Try selecting a different time period</p>
              <button
                onClick={() => setFilter('all')}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Show All Trips
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📅</div>
              <p className="text-gray-600 text-lg">No upcoming trips scheduled</p>
              <p className="text-gray-500 text-sm mt-2">Check back later for new assignments</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/driver/schedules"
              className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <span className="text-3xl">📅</span>
              <div>
                <p className="font-semibold text-gray-900">View Schedule</p>
                <p className="text-sm text-gray-600">Check your assignments</p>
              </div>
            </Link>
            
            <Link
              to="/driver/passengers"
              className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <span className="text-3xl">👥</span>
              <div>
                <p className="font-semibold text-gray-900">Passenger List</p>
                <p className="text-sm text-gray-600">View booked passengers</p>
              </div>
            </Link>
            
            <Link
              to="/driver/profile"
              className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <span className="text-3xl">👤</span>
              <div>
                <p className="font-semibold text-gray-900">My Profile</p>
                <p className="text-sm text-gray-600">Update your information</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

  )
}

export default DriverDashboard