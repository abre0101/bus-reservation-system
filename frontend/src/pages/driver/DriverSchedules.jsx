import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Users, Car, ChevronRight, ChevronLeft } from 'lucide-react'
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
      
      // Calculate date range based on view mode
      const startDate = currentDate.toISOString().split('T')[0]
      let endDate
      
      if (viewMode === 'week') {
        const weekLater = new Date(currentDate)
        weekLater.setDate(currentDate.getDate() + 6) // Show 7 days including today
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
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    } catch (error) {
      return dateString
    }
  }

  const formatShortDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch (error) {
      return dateString
    }
  }

  const formatTime = (timeString) => {
    if (!timeString) return 'No time'
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

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-50 text-blue-700 border border-blue-200',
      departed: 'bg-green-50 text-green-700 border border-green-200',
      active: 'bg-green-50 text-green-700 border border-green-200',
      in_progress: 'bg-orange-50 text-orange-700 border border-orange-200',
      completed: 'bg-gray-50 text-gray-700 border border-gray-200',
      cancelled: 'bg-red-50 text-red-700 border border-red-200'
    }
    return colors[status] || 'bg-gray-50 text-gray-700 border border-gray-200'
  }

  const getStatusIcon = (status) => {
    const icons = {
      scheduled: '⏰',
      departed: '🚀',
      active: '🎯',
      in_progress: '🔄',
      completed: '✅',
      cancelled: '❌'
    }
    return icons[status] || '📋'
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
      end.setMonth(start.getMonth() + 1)
      end.setDate(0) // Last day of the month
      return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
  }

  const groupedSchedules = groupByDate(schedules)

  const ScheduleCard = ({ trip }) => (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 p-5 hover:shadow-xl hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-gray-900">
              {trip.route?.origin || trip.origin_city || 'Unknown'} 
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <MapPin className="w-4 h-4 text-green-600" />
            <span className="font-bold text-gray-900">
              {trip.route?.destination || trip.destination_city || 'Unknown'}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{formatTime(trip.departure_time || trip.departureTime)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Car className="w-4 h-4" />
              <span>{trip.bus?.plate_number || trip.bus?.bus_number || trip.plate_number || 'N/A'}</span>
            </div>
          </div>
        </div>
        
        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(trip.status)}`}>
          <span className="text-xs">{getStatusIcon(trip.status)}</span>
          {trip.status?.replace('_', ' ').toUpperCase() || 'SCHEDULED'}
        </span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t-2 border-gray-100">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-gray-700 bg-blue-50 px-3 py-1.5 rounded-lg">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="font-semibold">{trip.booked_seats || 0}/{trip.total_seats || trip.bus?.capacity || 45}</span>
          </div>
        </div>
        
        {trip.estimated_duration && (
          <div className="text-sm text-gray-600 bg-purple-50 px-3 py-1.5 rounded-lg font-semibold">
            ⏱️ {trip.estimated_duration}
          </div>
        )}
      </div>
    </div>
  )

  const ViewModeButton = ({ mode, currentMode, onClick, icon }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
        currentMode === mode
          ? 'bg-blue-600 text-white shadow-lg'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {icon}
      <span>{mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
    </button>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <div className="w-full">
        {/* Header Section */}
        <div className="px-6 pt-6 mb-6">
          <div className="bg-gradient-to-r from-white to-purple-50 rounded-2xl shadow-xl p-8 mb-6 border-2 border-purple-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">My Schedule</h1>
              <p className="text-gray-600 text-lg">Plan and manage your upcoming journeys</p>
            </div>
            
            <div className="flex items-center gap-4 mt-4 lg:mt-0">
              <ViewModeButton
                mode="week"
                currentMode={viewMode}
                onClick={() => setViewMode('week')}
                icon={<Calendar className="w-4 h-4" />}
              />
              <ViewModeButton
                mode="month"
                currentMode={viewMode}
                onClick={() => setViewMode('month')}
                icon={<Calendar className="w-4 h-4" />}
              />
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-blue-200">
            <button
              onClick={() => navigateDate('prev')}
              className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-blue-300 rounded-xl hover:bg-blue-50 hover:border-blue-400 transition-all duration-300 font-semibold text-gray-700 shadow-md hover:shadow-lg"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>
            
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{getDateRangeText()}</h3>
              <p className="text-blue-600 text-sm font-semibold">
                📅 {Object.keys(groupedSchedules).length} days with trips
              </p>
            </div>
            
            <button
              onClick={() => navigateDate('next')}
              className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-blue-300 rounded-xl hover:bg-blue-50 hover:border-blue-400 transition-all duration-300 font-semibold text-gray-700 shadow-md hover:shadow-lg"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Schedule Content */}
        <div className="px-6 pb-6">
          {loading ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600 text-lg font-semibold">Loading your schedule...</p>
              <p className="text-gray-500">Fetching your upcoming trips</p>
            </div>
          ) : Object.keys(groupedSchedules).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedSchedules)
                .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
                .map(([date, trips]) => (
                  <div key={date} className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-100 hover:border-blue-200 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
                      <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                          {formatDate(date)}
                        </h3>
                        <p className="text-blue-600 font-semibold">
                          {trips.length} trip{trips.length !== 1 ? 's' : ''} scheduled
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {trips.map((trip) => (
                        <ScheduleCard key={trip._id || trip.id} trip={trip} />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-16 text-center border-2 border-gray-200">
              <div className="text-8xl mb-6">📅</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No scheduled trips</h3>
              <p className="text-gray-600 text-lg mb-2">
                You don't have any trips scheduled for {viewMode === 'week' ? 'this week' : 'this month'}
              </p>
              <p className="text-gray-500">New assignments will appear here when scheduled</p>
            </div>
          )}
        </div>

          {/* Quick Stats */}
          {!loading && schedules.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-6 mt-6 border-2 border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-purple-600 rounded-full"></div>
                Schedule Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300">
                  <div className="text-3xl font-bold text-white">{schedules.length}</div>
                  <div className="text-sm text-blue-100 font-semibold">Total Trips</div>
                </div>
                <div className="text-center p-5 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300">
                  <div className="text-3xl font-bold text-white">
                    {schedules.filter(t => t.status === 'scheduled').length}
                  </div>
                  <div className="text-sm text-green-100 font-semibold">Upcoming</div>
                </div>
                <div className="text-center p-5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300">
                  <div className="text-3xl font-bold text-white">
                    {schedules.filter(t => t.status === 'in_progress' || t.status === 'departed').length}
                  </div>
                  <div className="text-sm text-orange-100 font-semibold">In Progress</div>
                </div>
                <div className="text-center p-5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300">
                  <div className="text-3xl font-bold text-white">
                    {schedules.filter(t => t.status === 'completed').length}
                  </div>
                  <div className="text-sm text-purple-100 font-semibold">Completed</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DriverSchedules