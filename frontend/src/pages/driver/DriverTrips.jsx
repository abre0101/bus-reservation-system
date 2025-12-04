import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Play, Eye, MapPin, Clock, Users, Calendar, Bus, ArrowRight, 
  Navigation, Gauge, CheckCircle, AlertCircle, TrendingUp, Filter
} from 'lucide-react'
import { toast } from 'react-toastify'
import api from '../../services/api'

const DriverTrips = () => {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [startingTrip, setStartingTrip] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [stats, setStats] = useState({
    total: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0
  })
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchTrips()
  }, [filter])

  const calculateDuration = (departureTime, arrivalTime) => {
    if (!departureTime || !arrivalTime) return null
    
    try {
      const [depHour, depMin] = departureTime.split(':').map(Number)
      const [arrHour, arrMin] = arrivalTime.split(':').map(Number)
      
      let totalMinutes = (arrHour * 60 + arrMin) - (depHour * 60 + depMin)
      
      if (totalMinutes < 0) {
        totalMinutes += 24 * 60
      }
      
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      
      if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}m`
      } else if (hours > 0) {
        return `${hours}h`
      } else {
        return `${minutes}m`
      }
    } catch (error) {
      return null
    }
  }

  const fetchTrips = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/driver/trips?status=${filter}`)
      const fetchedTrips = response.data.trips || []
      
      const total = fetchedTrips.length
      const scheduled = fetchedTrips.filter(t => t.status === 'scheduled').length
      const inProgress = fetchedTrips.filter(t => t.status === 'departed' || t.status === 'active').length
      const completed = fetchedTrips.filter(t => t.status === 'completed').length
      
      setStats({ total, scheduled, inProgress, completed })
      
      const sortedTrips = fetchedTrips.sort((a, b) => {
        const dateA = new Date(`${a.departure_date} ${a.departure_time || '00:00'}`)
        const dateB = new Date(`${b.departure_date} ${b.departure_time || '00:00'}`)
        return dateA - dateB
      })
      
      const tripsWithDuration = sortedTrips.map(trip => ({
        ...trip,
        estimated_duration: trip.estimated_duration || calculateDuration(trip.departure_time, trip.arrival_time)
      }))
      
      setTrips(tripsWithDuration)
    } catch (error) {
      console.error('Error fetching trips:', error)
      toast.error('Failed to load trips')
    } finally {
      setLoading(false)
    }
  }

  const handleStartJourney = async (tripId) => {
    try {
      setStartingTrip(tripId)
      
      const checkResponse = await api.get(`/driver/trips/${tripId}/can-start`)
      
      if (!checkResponse.data.can_start) {
        toast.warning(checkResponse.data.message || 'Cannot start journey yet')
        return
      }
      
      await api.post(`/driver/trips/${tripId}/start`)
      toast.success('🚀 Journey started successfully!')
      
      navigate('/driver/active-trip')
    } catch (error) {
      console.error('Error starting journey:', error)
      toast.error(error.response?.data?.error || 'Failed to start journey')
    } finally {
      setStartingTrip(null)
    }
  }

  const getTimeUntilCanStart = (trip) => {
    if (!trip.departure_date || !trip.departure_time) return null
    
    const departure_dateTime = new Date(`${trip.departure_date}T${trip.departure_time}`)
    const canStartTime = new Date(departure_dateTime.getTime() - (3 * 60 * 60 * 1000))
    const now = currentTime
    
    const diffMs = canStartTime - now
    
    if (diffMs <= 0) {
      return { canStart: true, message: 'Ready to start' }
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    return {
      canStart: false,
      hours,
      minutes,
      message: `Available in ${hours}h ${minutes}m`
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: { bg: 'bg-blue-500', text: 'Scheduled', icon: '📅' },
      departed: { bg: 'bg-green-500', text: 'Departed', icon: '🚀' },
      active: { bg: 'bg-green-500', text: 'Active', icon: '🎯' },
      completed: { bg: 'bg-gray-500', text: 'Completed', icon: '✅' },
      cancelled: { bg: 'bg-red-500', text: 'Cancelled', icon: '❌' },
      in_progress: { bg: 'bg-orange-500', text: 'In Progress', icon: '🔄' }
    }
    return badges[status] || badges.scheduled
  }

  const formatTime = (time) => {
    if (!time) return '--:--'
    return time.includes(':') ? time : `${time.substring(0, 2)}:${time.substring(2)}`
  }

  const TripCard = ({ trip }) => {
    const statusBadge = getStatusBadge(trip.status)
    const passengerCount = trip.passenger_count || trip.booked_seats || 0
    const totalSeats = trip.total_seats || 45
    const occupancyRate = totalSeats ? (passengerCount / totalSeats) * 100 : 0
    
    return (
      <div className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 hover:border-blue-400">
        {/* Gradient Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-4 overflow-hidden">
          <div className="relative z-10 flex justify-between items-center">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-blue-200" />
                <h3 className="text-lg font-bold text-white">{trip.origin_city || trip.departure_city}</h3>
              </div>
              <div className="flex items-center gap-2 ml-6">
                <Navigation className="w-4 h-4 text-blue-200" />
                <h3 className="text-lg font-bold text-white">{trip.destination_city || trip.arrival_city}</h3>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <span className={`${statusBadge.bg} text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1`}>
                <span>{statusBadge.icon}</span>
                {statusBadge.text}
              </span>
              <span className="text-white text-sm font-bold">{trip.fare_birr || 0} ETB</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Trip Info */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-900">{trip.departure_date}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-purple-600" />
              <span className="font-semibold text-gray-900">{formatTime(trip.departure_time)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Bus className="w-4 h-4 text-gray-600" />
              <span className="font-semibold text-gray-900">{trip.plate_number || trip.bus_number || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Gauge className="w-4 h-4 text-gray-600" />
              <span className="font-semibold text-gray-900">{trip.estimated_duration || 'N/A'}</span>
            </div>
          </div>

          {/* Passenger Occupancy */}
          <div className="bg-green-50 p-3 rounded-xl border border-green-200 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-gray-700">
                  {passengerCount} / {totalSeats} Passengers
                </span>
              </div>
              <span className="text-sm font-bold text-green-600">{occupancyRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${occupancyRate}%` }}
              ></div>
            </div>
          </div>

          {/* Countdown Timer */}
          {trip.status === 'scheduled' && (() => {
            const timeInfo = getTimeUntilCanStart(trip)
            if (timeInfo && !timeInfo.canStart) {
              return (
                <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <div className="flex-1">
                      <p className="text-xs text-yellow-700 font-medium">Start Available In:</p>
                      <p className="text-sm font-bold text-yellow-900">
                        {timeInfo.hours}h {timeInfo.minutes}m
                      </p>
                    </div>
                  </div>
                </div>
              )
            } else if (timeInfo && timeInfo.canStart) {
              return (
                <div className="bg-green-50 border border-green-300 rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-bold text-green-900">✅ Ready to Start!</p>
                  </div>
                </div>
              )
            }
            return null
          })()}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Link
              to={`/driver/trips/${trip.id || trip._id}`}
              className="flex-1 bg-white border-2 border-blue-600 text-blue-600 py-2.5 rounded-xl text-center hover:bg-blue-50 transition-all flex items-center justify-center gap-2 font-semibold text-sm"
            >
              <Eye className="w-4 h-4" />
              View Details
            </Link>
            
            {trip.status === 'scheduled' && (() => {
              const timeInfo = getTimeUntilCanStart(trip)
              const canStartNow = timeInfo?.canStart || false
              const isStarting = startingTrip === (trip.id || trip._id)
              
              return (
                <button
                  onClick={() => handleStartJourney(trip.id || trip._id)}
                  disabled={!canStartNow || isStarting}
                  className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 font-semibold text-sm ${
                    canStartNow && !isStarting
                      ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isStarting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Starting...
                    </>
                  ) : canStartNow ? (
                    <>
                      <Play className="w-4 h-4" />
                      Start Journey
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      Not Ready
                    </>
                  )}
                </button>
              )
            })()}
            
            {(trip.status === 'departed' || trip.status === 'active' || trip.status === 'in_progress') && (
              <Link
                to="/driver/active-trip"
                className="flex-1 bg-orange-600 text-white py-2.5 rounded-xl text-center hover:bg-orange-700 transition-all flex items-center justify-center gap-2 font-semibold text-sm"
              >
                <Navigation className="w-4 h-4" />
                Continue Trip
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  const StatCard = ({ icon: Icon, label, value, gradient }) => (
    <div className={`relative overflow-hidden ${gradient} rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300`}>
      <div className="relative z-10 flex items-center gap-3">
        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-white/80 font-medium uppercase">{label}</p>
        </div>
      </div>
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
    </div>
  )

  const FilterButton = ({ status, count, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm ${
        isActive
          ? 'bg-blue-600 text-white shadow-md'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <span>{status.replace('_', ' ').toUpperCase()}</span>
      {count > 0 && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
          isActive ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'
        }`}>
          {count}
        </span>
      )}
    </button>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
                <Bus className="w-8 h-8" />
                My Trips
              </h1>
              <p className="text-blue-100">Manage your scheduled journeys</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-white/80 text-xs mt-1">{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            icon={TrendingUp}
            label="Total Trips" 
            value={stats.total}
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatCard 
            icon={Calendar}
            label="Scheduled" 
            value={stats.scheduled}
            gradient="bg-gradient-to-br from-green-500 to-emerald-600"
          />
          <StatCard 
            icon={Navigation}
            label="In Progress" 
            value={stats.inProgress}
            gradient="bg-gradient-to-br from-orange-500 to-red-500"
          />
          <StatCard 
            icon={CheckCircle}
            label="Completed" 
            value={stats.completed}
            gradient="bg-gradient-to-br from-purple-500 to-purple-600"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Filter Trips</h2>
          </div>
          <div className="flex gap-3 flex-wrap">
            <FilterButton 
              status="all" 
              count={stats.total}
              isActive={filter === 'all'} 
              onClick={() => setFilter('all')} 
            />
            <FilterButton 
              status="scheduled" 
              count={stats.scheduled}
              isActive={filter === 'scheduled'} 
              onClick={() => setFilter('scheduled')} 
            />
            <FilterButton 
              status="in_progress" 
              count={stats.inProgress}
              isActive={filter === 'in_progress'} 
              onClick={() => setFilter('in_progress')} 
            />
            <FilterButton 
              status="completed" 
              count={stats.completed}
              isActive={filter === 'completed'} 
              onClick={() => setFilter('completed')} 
            />
          </div>
        </div>

        {/* Trips List */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
            <p className="text-lg font-semibold text-gray-900">Loading your trips...</p>
          </div>
        ) : trips.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {trips.map((trip) => (
              <TripCard key={trip.id || trip._id} trip={trip} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bus className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Trips Found</h3>
            <p className="text-gray-600">You don't have any {filter !== 'all' ? filter.replace('_', ' ') : ''} trips scheduled</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default DriverTrips
