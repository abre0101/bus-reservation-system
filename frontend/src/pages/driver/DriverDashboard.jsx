import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Bus, Eye, Calendar, Users, CheckCircle, Clock, MapPin, 
  Navigation, Fuel, AlertCircle, TrendingUp, Award, Route as RouteIcon
} from 'lucide-react'
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
  const [filter, setFilter] = useState('today')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    fetchFilteredTrips()
  }, [filter])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
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
        endDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
      }

      const response = await api.get('/driver/schedules', {
        params: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        }
      })

      const trips = response.data.schedules || []
      const upcomingOnly = trips.filter(trip => 
        trip.status === 'scheduled' || trip.status === 'delayed'
      )
      
      const completedTrips = trips.filter(trip => 
        trip.status === 'completed' || trip.status === 'arrived'
      )
      
      const departedTrips = trips.filter(trip => 
        trip.status === 'departed' || trip.status === 'active'
      )
      
      let totalPassengers = 0
      upcomingOnly.forEach(trip => {
        totalPassengers += trip.booked_seats || 0
      })
      
      const activeTrip = departedTrips.length > 0 ? departedTrips[0] : null
      
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

  const formatTime = (time) => {
    if (!time) return 'N/A'
    return time.includes(':') ? time : `${time.substring(0, 2)}:${time.substring(2)}`
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const StatCard = ({ icon: Icon, label, value, subtext, gradient, iconBg }) => (
    <div className={`relative overflow-hidden rounded-2xl shadow-xl ${gradient} p-6 text-white transform hover:scale-105 transition-all duration-300`}>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`${iconBg} p-3 rounded-xl shadow-lg`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="text-right">
            <p className="text-white/80 text-sm font-medium uppercase tracking-wide">{label}</p>
            <p className="text-4xl font-bold mt-1">{value}</p>
            {subtext && <p className="text-white/70 text-xs mt-1">{subtext}</p>}
          </div>
        </div>
      </div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
    </div>
  )

  const TripCard = ({ trip }) => {
    const occupancyRate = trip.total_seats ? ((trip.booked_seats || 0) / trip.total_seats) * 100 : 0
    
    // Get bus number from various possible fields
    const getBusNumber = () => {
      return trip.bus?.plate_number || 
             trip.bus?.bus_number || 
             trip.bus_number || 
             trip.plate_number || 
             trip.busNumber ||
             trip.bus?.number ||
             trip.bus_plate_number ||
             'Not Assigned'
    }
    
    return (
      <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 group">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-blue-200" />
                <h3 className="font-bold text-lg text-white">
                  {trip.origin_city || 'N/A'}
                </h3>
              </div>
              <div className="flex items-center gap-2 ml-6">
                <Navigation className="w-4 h-4 text-blue-200" />
                <h3 className="font-bold text-lg text-white">
                  {trip.destination_city || 'N/A'}
                </h3>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
              trip.status === 'scheduled' ? 'bg-green-400 text-green-900' :
              trip.status === 'delayed' ? 'bg-yellow-400 text-yellow-900' :
              'bg-gray-400 text-gray-900'
            }`}>
              {trip.status?.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-xl">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium">Date</p>
                <p className="text-sm font-bold text-gray-900">{formatDate(trip.departure_date)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-purple-50 p-3 rounded-xl">
              <div className="bg-purple-600 p-2 rounded-lg">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium">Departure</p>
                <p className="text-sm font-bold text-gray-900">{formatTime(trip.departure_time)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="bg-gray-50 p-3 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bus className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Bus Number</span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {getBusNumber()}
                </span>
              </div>
              {(trip.bus?.name || trip.bus_name) && (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                  <Bus className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-600">
                    {trip.bus?.name || trip.bus_name}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Passengers</span>
                </div>
                <span className="text-sm font-bold text-green-900">
                  {trip.booked_seats || 0} / {trip.total_seats || 45}
                </span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${occupancyRate}%` }}
                ></div>
              </div>
              <p className="text-xs text-green-700 mt-1 text-right font-medium">{occupancyRate.toFixed(0)}% Full</p>
            </div>
          </div>

          <Link
            to={`/driver/trips/${trip.id || trip._id}`}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl text-center hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 font-semibold shadow-lg group-hover:shadow-xl"
          >
            <Eye className="w-4 h-4" />
            View Trip Details
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Welcome Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl shadow-2xl p-8">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                  <Bus className="w-10 h-10" />
                  Welcome back, {user?.full_name || user?.name}!
                </h1>
                <p className="text-blue-100 text-lg">
                  {filter === 'today' && "Ready to hit the road today"}
                  {filter === 'week' && "Your week ahead at a glance"}
                  {filter === 'month' && "Your monthly schedule overview"}
                  {filter === 'all' && "Your complete driving schedule"}
                </p>
              </div>
              <div className="hidden md:block">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
                  <p className="text-white/80 text-sm font-medium">Current Time</p>
                  <p className="text-3xl font-bold text-white">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="text-white/80 text-xs mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
        </div>

        {/* Active Trip Alert */}
        {stats.activeTrip && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-4 rounded-xl">
                  <Navigation className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-1">🚌 Trip in Progress</h3>
                  <p className="text-green-100 text-lg">
                    {stats.activeTrip.route?.origin} → {stats.activeTrip.route?.destination}
                  </p>
                </div>
              </div>
              <Link
                to="/driver/active-trip"
                className="bg-white text-green-600 px-8 py-3 rounded-xl hover:bg-green-50 transition-all font-bold shadow-lg"
              >
                Manage Trip →
              </Link>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={Calendar}
            label={filter === 'today' ? "Today's Trips" : filter === 'week' ? "This Week" : filter === 'month' ? "This Month" : "Total Trips"}
            value={filteredTrips.length}
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
            iconBg="bg-blue-400/30"
          />
          <StatCard
            icon={CheckCircle}
            label="Completed"
            value={stats.completedTrips}
            subtext="Successful trips"
            gradient="bg-gradient-to-br from-green-500 to-emerald-600"
            iconBg="bg-green-400/30"
          />
          <StatCard
            icon={Users}
            label="Passengers"
            value={stats.totalPassengers}
            subtext="Total booked"
            gradient="bg-gradient-to-br from-purple-500 to-purple-600"
            iconBg="bg-purple-400/30"
          />
          <StatCard
            icon={TrendingUp}
            label="Status"
            value={stats.activeTrip ? 'Active' : 'Ready'}
            subtext={stats.activeTrip ? 'On the road' : 'Awaiting trip'}
            gradient="bg-gradient-to-br from-orange-500 to-red-500"
            iconBg="bg-orange-400/30"
          />
        </div>

        {/* Upcoming Trips Section */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <RouteIcon className="w-8 h-8 text-blue-600" />
                Your Schedule
              </h2>
              <p className="text-gray-600 mt-1">Manage your upcoming trips</p>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setFilter('today')}
                disabled={loading}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  filter === 'today'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setFilter('week')}
                disabled={loading}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  filter === 'week'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setFilter('month')}
                disabled={loading}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  filter === 'month'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Month
              </button>
              <Link
                to="/driver/trips"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
              >
                View All →
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading your trips...</p>
            </div>
          ) : filteredTrips.length > 0 ? (
            <>
              <div className="mb-6 flex items-center justify-between bg-blue-50 p-4 rounded-xl">
                <p className="text-blue-900 font-semibold">
                  Showing {filteredTrips.length} {filteredTrips.length === 1 ? 'trip' : 'trips'}
                </p>
                <div className="flex items-center gap-2 text-blue-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Click any trip for details</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTrips.slice(0, 6).map((trip, index) => (
                  <TripCard key={trip.id || trip._id || `trip-${index}`} trip={trip} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No Trips Scheduled</h3>
              <p className="text-gray-600 mb-6">You don't have any trips for this period</p>
              <button
                onClick={() => setFilter('all')}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
              >
                View All Trips
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/driver/schedules"
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all p-6 border-2 border-transparent hover:border-blue-500"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-gray-900">Full Schedule</h3>
                <p className="text-gray-600 text-sm">View all assignments</p>
              </div>
            </div>
          </Link>
          
          <Link
            to="/driver/passengers"
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all p-6 border-2 border-transparent hover:border-purple-500"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-gray-900">Passengers</h3>
                <p className="text-gray-600 text-sm">View passenger lists</p>
              </div>
            </div>
          </Link>
          
          <Link
            to="/driver/profile"
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all p-6 border-2 border-transparent hover:border-green-500"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-gray-900">My Profile</h3>
                <p className="text-gray-600 text-sm">Update information</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default DriverDashboard
