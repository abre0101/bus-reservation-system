import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Users, Bus, ChevronRight, ChevronLeft, Navigation } from 'lucide-react'
import api from '../../services/api'

const DriverSchedules = () => {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('week')
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    fetchSchedules()
  }, [viewMode, currentDate])

  const fetchSchedules = async () => {
    try {
      setLoading(true)
      
      const startDate = currentDate.toISOString().split('T')[0]
      let endDate
      
      if (viewMode === 'week') {
        const weekLater = new Date(currentDate)
        weekLater.setDate(currentDate.getDate() + 6)
        endDate = weekLater.toISOString().split('T')[0]
      } else {
        const monthLater = new Date(currentDate)
        monthLater.setMonth(currentDate.getMonth() + 1)
        endDate = monthLater.toISOString().split('T')[0]
      }
      
      const response = await api.get(`/driver/schedules?start_date=${startDate}&end_date=${endDate}`)
      setSchedules(response.data.schedules || [])
    } catch (error) {
      console.error('Error fetching schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate)
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
    } else {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1))
    }
    setCurrentDate(newDate)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No date'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      })
    } catch (error) {
      return dateString
    }
  }

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A'
    try {
      if (typeof timeString === 'string' && timeString.includes(':')) {
        const [hours, minutes] = timeString.split(':')
        const date = new Date()
        date.setHours(parseInt(hours), parseInt(minutes))
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }
      const date = new Date(timeString)
      if (isNaN(date.getTime())) return timeString
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } catch (error) {
      return timeString
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: { bg: 'bg-blue-500', text: 'Scheduled', icon: '📅' },
      departed: { bg: 'bg-green-500', text: 'Departed', icon: '🚀' },
      active: { bg: 'bg-green-500', text: 'Active', icon: '🎯' },
      in_progress: { bg: 'bg-orange-500', text: 'In Progress', icon: '🔄' },
      completed: { bg: 'bg-gray-500', text: 'Completed', icon: '✅' },
      cancelled: { bg: 'bg-red-500', text: 'Cancelled', icon: '❌' }
    }
    return badges[status] || badges.scheduled
  }

  const groupByDate = (trips) => {
    const grouped = {}
    trips.forEach(trip => {
      const dateKey = trip.departure_date || trip.departure_date
      if (!grouped[dateKey]) grouped[dateKey] = []
      grouped[dateKey].push(trip)
    })
    return grouped
  }

  const getDateRangeText = () => {
    const start = new Date(currentDate)
    let end = new Date(currentDate)
    
    if (viewMode === 'week') {
      end.setDate(start.getDate() + 6)
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    } else {
      return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
  }

  const groupedSchedules = groupByDate(schedules)

  const ScheduleCard = ({ trip }) => {
    const statusBadge = getStatusBadge(trip.status)
    const passengerCount = trip.booked_seats || 0
    const totalSeats = trip.total_seats || trip.bus?.capacity || 45
    const occupancyRate = totalSeats ? (passengerCount / totalSeats) * 100 : 0
    
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg hover:border-blue-400 transition-all duration-300">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-gray-900 text-sm">
                {trip.route?.origin || trip.origin_city || 'Unknown'} 
              </span>
              <ChevronRight className="w-3 h-3 text-gray-400" />
              <Navigation className="w-4 h-4 text-green-600" />
              <span className="font-bold text-gray-900 text-sm">
                {trip.route?.destination || trip.destination_city || 'Unknown'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatTime(trip.departure_time || trip.departureTime)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Bus className="w-3 h-3" />
                <span>{trip.bus?.plate_number || trip.bus?.bus_number || trip.plate_number || 'N/A'}</span>
              </div>
              {(trip.bus?.name || trip.bus_name) && (
                <div className="col-span-2 flex items-center gap-1 text-blue-600 font-semibold">
                  <Bus className="w-3 h-3" />
                  <span>{trip.bus?.name || trip.bus_name}</span>
                </div>
              )}
            </div>
          </div>
          
          <span className={`${statusBadge.bg} text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1`}>
            <span>{statusBadge.icon}</span>
            {statusBadge.text}
          </span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-gray-700">
              {passengerCount} / {totalSeats}
            </span>
            <span className="text-xs text-green-600 font-semibold">
              ({occupancyRate.toFixed(1)}%)
            </span>
          </div>
          
          {trip.estimated_duration && (
            <div className="text-xs text-gray-600 font-semibold">
              ⏱️ {trip.estimated_duration}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
                  <Calendar className="w-8 h-8" />
                  My Schedule
                </h1>
                <p className="text-blue-100">Plan and manage your upcoming journeys</p>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                    viewMode === 'week'
                      ? 'bg-white text-blue-600 shadow-lg'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                    viewMode === 'month'
                      ? 'bg-white text-blue-600 shadow-lg'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Month
                </button>
              </div>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center justify-between bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <button
                onClick={() => navigateDate('prev')}
                className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-lg hover:bg-white transition-all font-semibold text-gray-700 text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              <div className="text-center">
                <h3 className="text-xl font-bold text-white">{getDateRangeText()}</h3>
                <p className="text-blue-100 text-sm">
                  {Object.keys(groupedSchedules).length} days with trips
                </p>
              </div>
              
              <button
                onClick={() => navigateDate('next')}
                className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-lg hover:bg-white transition-all font-semibold text-gray-700 text-sm"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
        </div>

        {/* Stats */}
        {!loading && schedules.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 shadow-lg text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{schedules.length}</p>
                  <p className="text-xs text-blue-100">Total Trips</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 shadow-lg text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {schedules.filter(t => t.status === 'scheduled').length}
                  </p>
                  <p className="text-xs text-green-100">Upcoming</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-4 shadow-lg text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {schedules.filter(t => t.status === 'in_progress' || t.status === 'departed').length}
                  </p>
                  <p className="text-xs text-orange-100">In Progress</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 shadow-lg text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {schedules.filter(t => t.status === 'completed').length}
                  </p>
                  <p className="text-xs text-purple-100">Completed</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Content */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
            <p className="text-lg font-semibold text-gray-900">Loading your schedule...</p>
          </div>
        ) : Object.keys(groupedSchedules).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedSchedules)
              .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
              .map(([date, trips]) => (
                <div key={date} className="bg-white rounded-2xl shadow-lg p-5 border border-gray-200">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {formatDate(date)}
                      </h3>
                      <p className="text-sm text-blue-600 font-semibold">
                        {trips.length} trip{trips.length !== 1 ? 's' : ''} scheduled
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {trips.map((trip) => (
                      <ScheduleCard key={trip._id || trip.id} trip={trip} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Scheduled Trips</h3>
            <p className="text-gray-600">
              You don't have any trips scheduled for {viewMode === 'week' ? 'this week' : 'this month'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default DriverSchedules
