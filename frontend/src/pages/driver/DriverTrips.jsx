import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Play, Eye, MapPin, Clock, Users, Calendar, Car, ArrowRight } from 'lucide-react'
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

  // Update current time every minute for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

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
      
      // Handle overnight journeys
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
      
      // Calculate stats
      const total = fetchedTrips.length
      const scheduled = fetchedTrips.filter(t => t.status === 'scheduled').length
      const inProgress = fetchedTrips.filter(t => t.status === 'departed' || t.status === 'active').length
      const completed = fetchedTrips.filter(t => t.status === 'completed').length
      
      setStats({ total, scheduled, inProgress, completed })
      
      // Sort trips by departure date and time (nearest first)
      const sortedTrips = fetchedTrips.sort((a, b) => {
        const dateA = new Date(`${a.departure_date} ${a.departure_time || '00:00'}`)
        const dateB = new Date(`${b.departure_date} ${b.departure_time || '00:00'}`)
        return dateA - dateB
      })
      
      // Calculate duration for each trip
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

  // Calculate time until driver can start (3 hours before departure)
  const getTimeUntilCanStart = (trip) => {
    if (!trip.departure_date || !trip.departure_time) return null
    
    const departure_dateTime = new Date(`${trip.departure_date}T${trip.departure_time}`)
    const canStartTime = new Date(departure_dateTime.getTime() - (3 * 60 * 60 * 1000)) // 3 hours before
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

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-50 text-blue-700 border border-blue-200',
      departed: 'bg-green-50 text-green-700 border border-green-200',
      active: 'bg-green-50 text-green-700 border border-green-200',
      completed: 'bg-gray-50 text-gray-700 border border-gray-200',
      cancelled: 'bg-red-50 text-red-700 border border-red-200',
      in_progress: 'bg-orange-50 text-orange-700 border border-orange-200'
    }
    return colors[status] || 'bg-gray-50 text-gray-700 border border-gray-200'
  }

  const getStatusIcon = (status) => {
    const icons = {
      scheduled: '⏰',
      departed: '🚀',
      active: '🎯',
      completed: '✅',
      cancelled: '❌',
      in_progress: '🔄'
    }
    return icons[status] || '📋'
  }

  const formatTime = (time) => {
    if (!time) return '--:--'
    return time.includes(':') ? time : `${time.substring(0, 2)}:${time.substring(2)}`
  }

  const TripCard = ({ trip }) => (
    <div className="bg-white rounded-2xl shadow-md border-2 border-gray-100 p-6 hover:shadow-2xl hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-2 hover:scale-[1.02]">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-900">{trip.origin_city || trip.departure_city}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-gray-900">{trip.destination_city || trip.arrival_city}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{trip.departure_date}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatTime(trip.departure_time)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(trip.status)}`}>
            <span className="text-xs">{getStatusIcon(trip.status)}</span>
            {trip.status?.replace('_', ' ').toUpperCase() || 'SCHEDULED'}
          </span>
          <span className="text-lg font-bold text-gray-900">
            {trip.fare_birr || 0} ETB
          </span>
        </div>
      </div>

      {/* Trip Details Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <Car className="w-6 h-6 text-blue-600 mx-auto mb-1" />
          <p className="text-xs text-gray-600">Bus Number</p>
          <p className="font-bold text-gray-900">{trip.plate_number || trip.bus_number || 'N/A'}</p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <Users className="w-6 h-6 text-green-600 mx-auto mb-1" />
          <p className="text-xs text-gray-600">Passengers</p>
          <p className="font-bold text-gray-900">{trip.passenger_count || trip.booked_seats || 0}<span className="text-gray-500 text-xs">/{trip.total_seats || 45}</span></p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="w-6 h-6 mx-auto mb-1 flex items-center justify-center">🚌</div>
          <p className="text-xs text-gray-600">Bus Type</p>
          <p className="font-bold text-gray-900 capitalize">{trip.bus_type || 'Standard'}</p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <Clock className="w-6 h-6 text-purple-600 mx-auto mb-1" />
          <p className="text-xs text-gray-600">Duration</p>
          <p className="font-bold text-gray-900">{trip.estimated_duration || 'N/A'}</p>
        </div>
      </div>

      {/* Countdown Timer for Scheduled Trips */}
      {trip.status === 'scheduled' && (() => {
        const timeInfo = getTimeUntilCanStart(trip)
        if (timeInfo && !timeInfo.canStart) {
          return (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-semibold text-yellow-900">Start Available In:</p>
                  <p className="text-lg font-bold text-yellow-700">
                    {timeInfo.hours}h {timeInfo.minutes}m
                  </p>
                </div>
              </div>
            </div>
          )
        } else if (timeInfo && timeInfo.canStart) {
          return (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-green-600" />
                <p className="text-sm font-semibold text-green-900">✅ Ready to start journey!</p>
              </div>
            </div>
          )
        }
        return null
      })()}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Link
          to={`/driver/trips/${trip.id || trip._id}`}
          className="flex-1 bg-white border border-blue-600 text-blue-600 py-3 rounded-xl text-center hover:bg-blue-50 transition-all duration-200 flex items-center justify-center gap-2 font-semibold"
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
              className={`flex-1 py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-semibold shadow-lg ${
                canStartNow && !isStarting
                  ? 'bg-green-600 text-white hover:bg-green-700 hover:shadow-xl cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
              }`}
            >
              {isStarting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
                  Not Available Yet
                </>
              )}
            </button>
          )
        })()}
        
        {(trip.status === 'departed' || trip.status === 'active' || trip.status === 'in_progress') && (
          <Link
            to="/driver/active-trip"
            className="flex-1 bg-orange-600 text-white py-3 rounded-xl text-center hover:bg-orange-700 transition-all duration-200 flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl"
          >
            <Play className="w-4 h-4" />
            Continue Trip
          </Link>
        )}
      </div>
    </div>
  )

  const FilterButton = ({ status, count, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-3 ${
        isActive
          ? 'bg-blue-600 text-white shadow-lg transform scale-105'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
      }`}
    >
      <span>{status.replace('_', ' ').toUpperCase()}</span>
      {count > 0 && (
        <span className={`px-2 py-1 rounded-full text-xs ${
          isActive ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'
        }`}>
          {count}
        </span>
      )}
    </button>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="w-full">
        {/* Header Section */}
        <div className="mb-6 px-6 pt-6">
          <div className="bg-gradient-to-r from-white to-blue-50 rounded-2xl shadow-xl p-8 mb-6 border-2 border-blue-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">My Trips Dashboard</h1>
                <p className="text-gray-600 text-lg">Manage your scheduled journeys and track active trips</p>
              </div>
              <div className="mt-4 lg:mt-0">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-blue-800 font-semibold">Welcome back, Driver!</p>
                  <p className="text-blue-600 text-sm">Ready for your next journey?</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{stats.total}</p>
                  <p className="text-sm text-blue-100">Total Trips</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <Play className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{stats.scheduled}</p>
                  <p className="text-sm text-green-100">Scheduled</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{stats.inProgress}</p>
                  <p className="text-sm text-orange-100">In Progress</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{stats.completed}</p>
                  <p className="text-sm text-purple-100">Completed</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 mx-6 border-2 border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
            Filter Trips
          </h2>
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
        <div className="px-6 pb-6">
          {loading ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600 text-lg font-semibold">Loading your trips...</p>
              <p className="text-gray-500">Please wait while we fetch your journey details</p>
            </div>
          ) : trips.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {trips.map((trip) => (
                <TripCard key={trip.id || trip._id} trip={trip} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-16 text-center border border-gray-200">
              <div className="text-8xl mb-6">🚌</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No trips found</h3>
              <p className="text-gray-600 text-lg mb-2">You don't have any {filter !== 'all' ? filter.replace('_', ' ') : ''} trips scheduled</p>
              <p className="text-gray-500">New assignments will appear here when scheduled</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DriverTrips