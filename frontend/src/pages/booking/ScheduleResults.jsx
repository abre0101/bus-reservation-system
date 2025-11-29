import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Filter, Calendar, Clock, AlertCircle } from 'lucide-react'
import ScheduleList from '../../components/booking/ScheduleList'
import { bookingService } from '../../services/bookingService'
import { useAuth } from '../../hooks/useAuth'
import { toast } from 'react-toastify'

const ScheduleResults = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [filteredSchedules, setFilteredSchedules] = useState([])
  const [filters, setFilters] = useState({
    busType: 'all',
    sortBy: 'departure',
    showCompleted: false // New filter to show/hide completed schedules
  })

  const searchParams = new URLSearchParams(location.search)
  const source = searchParams.get('source')
  const destination = searchParams.get('destination')
  const date = searchParams.get('date')
  const passengers = searchParams.get('passengers') || 1

  useEffect(() => {
    loadSchedules()
  }, [location.search])

  useEffect(() => {
    applyFilters()
  }, [schedules, filters])

  const loadSchedules = async () => {
    if (!source || !destination || !date) {
      navigate('/search')
      return
    }

    setLoading(true)
    try {
      const response = await bookingService.searchSchedules({
        source,
        destination,
        date
      })
      setSchedules(response.schedules || [])
    } catch (error) {
      toast.error('Failed to load schedules')
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }

  // Check if a schedule has already departed or is too late to book (within 2 hours)
  const isScheduleCompleted = (schedule) => {
    const now = new Date()
    const scheduleDate = schedule.departure_date || schedule.departure_date || date
    const scheduleTime = schedule.departure_time || schedule.departureTime
    const scheduleDateTime = new Date(`${scheduleDate}T${scheduleTime}`)
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60000)
    
    // Block booking if:
    // 1. Departure time has passed, OR
    // 2. Departure is within 2 hours (too late to book)
    return scheduleDateTime < twoHoursFromNow
  }

  // Check if a schedule is departing within 24 hours (show warning)
  const isScheduleDepartingSoon = (schedule) => {
    const now = new Date()
    const scheduleDate = schedule.departure_date || schedule.departure_date || date
    const scheduleTime = schedule.departure_time || schedule.departureTime
    const scheduleDateTime = new Date(`${scheduleDate}T${scheduleTime}`)
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60000)
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60000)
    
    // Show warning if departure is between 2-24 hours away
    return scheduleDateTime > twoHoursFromNow && scheduleDateTime <= twentyFourHoursFromNow
  }

  const applyFilters = () => {
    let filtered = [...schedules]

    // Filter out completed schedules unless explicitly shown
    if (!filters.showCompleted) {
      filtered = filtered.filter(schedule => !isScheduleCompleted(schedule))
    }

    // Filter by bus type
    if (filters.busType !== 'all') {
      filtered = filtered.filter(schedule => 
        schedule.bus?.type === filters.busType || schedule.busType === filters.busType
      )
    }

    // Sort schedules
    filtered.sort((a, b) => {
      if (filters.sortBy === 'departure') {
        return a.departure_time.localeCompare(b.departure_time)
      } else if (filters.sortBy === 'fare') {
        return (a.fare || a.fareBirr) - (b.fare || b.fareBirr)
      } else if (filters.sortBy === 'duration') {
        const durationA = calculateDuration(a.departure_time, a.arrival_time)
        const durationB = calculateDuration(b.departure_time, b.arrival_time)
        return durationA - durationB
      }
      return 0
    })

    setFilteredSchedules(filtered)
  }

  const calculateDuration = (start, end) => {
    const startTime = new Date(`1970-01-01T${start}`)
    const endTime = new Date(`1970-01-01T${end}`)
    return endTime - startTime
  }

  const handleSelectSchedule = (schedule) => {
    // Check if schedule has already departed or is within 2 hours (too late to book)
    if (isScheduleCompleted(schedule)) {
      const now = new Date()
      const scheduleDate = schedule.departure_date || schedule.departure_date || date
      const scheduleTime = schedule.departure_time || schedule.departureTime
      const scheduleDateTime = new Date(`${scheduleDate}T${scheduleTime}`)
      
      if (scheduleDateTime < now) {
        toast.error('This schedule has already departed. Please select another schedule.')
      } else {
        toast.error('Booking closed - Departure is within 2 hours. Bookings close 2 hours before departure.')
      }
      return
    }

    // Check if schedule is departing within 24 hours (show warning)
    if (isScheduleDepartingSoon(schedule)) {
      const now = new Date()
      const scheduleDate = schedule.departure_date || schedule.departure_date || date
      const scheduleTime = schedule.departure_time || schedule.departureTime
      const scheduleDateTime = new Date(`${scheduleDate}T${scheduleTime}`)
      const hoursUntilDeparture = (scheduleDateTime - now) / (1000 * 60 * 60)
      
      toast.warning(`Departure in ${Math.round(hoursUntilDeparture)} hours. Please complete booking and arrive at the station on time.`, {
        autoClose: 5000
      })
    }

    if (!isAuthenticated) {
      toast.info('Please login to continue with booking')
      navigate('/login', { state: { from: location } })
      return
    }

    // Clear ALL previous booking session data before starting new booking
    console.log('🧹 Starting new booking - clearing all previous session data')
    const bookingSessionKeys = [
      'selectedSchedule',
      'selectedSeats',
      'passengerData',
      'baseFare',
      'passengerCount',
      'baggageData',
      'totalBaggageFee',
      'totalAmount',
      'bookingData',
      'chapa_tx_ref',
      'pending_booking_data',
      'pending_chapa_tx_ref',
      'pending_chapa_booking_data'
    ]
    bookingSessionKeys.forEach(key => sessionStorage.removeItem(key))
    console.log('✅ All previous booking data cleared')

    // Store NEW schedule in session storage for booking flow
    sessionStorage.setItem('selectedSchedule', JSON.stringify(schedule))
    sessionStorage.setItem('passengerCount', passengers)
    console.log('💾 New booking session started:', {
      schedule: schedule.departure_city + ' → ' + schedule.arrival_city,
      passengers: passengers
    })
    
    navigate('/seats')
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-ET', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Get statistics for display
  const getScheduleStats = () => {
    const totalSchedules = schedules.length
    const completedSchedules = schedules.filter(isScheduleCompleted).length
    const availableSchedules = totalSchedules - completedSchedules
    const departingSoonSchedules = schedules.filter(isScheduleDepartingSoon).length

    return { totalSchedules, completedSchedules, availableSchedules, departingSoonSchedules }
  }

  const stats = getScheduleStats()

  if (!source || !destination || !date) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Search</h2>
          <p className="text-gray-600 mb-6">Please provide all required search parameters.</p>
          <button onClick={() => navigate('/search')} className="btn-primary">
            Back to Search
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <button
            onClick={() => navigate('/search')}
            className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-all bg-white/90 backdrop-blur-md px-6 py-3 rounded-xl border-2 border-gray-200 hover:border-blue-300 shadow-lg hover:shadow-xl"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-semibold">Back to Search</span>
          </button>
          
          <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-xl border-2 border-gray-200 shadow-lg">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {source} → {destination}
            </h1>
            <p className="text-gray-600 flex items-center space-x-2 font-medium">
              <Calendar className="h-5 w-5" />
              <span>{formatDate(date)}</span>
              <span>•</span>
              <span>{passengers} {passengers === '1' ? 'Passenger' : 'Passengers'}</span>
            </p>
          </div>
        </div>

        {/* Schedule Statistics */}
        {!loading && schedules.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">
                    {stats.availableSchedules} Available
                  </span>
                </div>
                {stats.departingSoonSchedules > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">
                      {stats.departingSoonSchedules} Departing Soon
                    </span>
                  </div>
                )}
                {stats.completedSchedules > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">
                      {stats.completedSchedules} Departed
                    </span>
                  </div>
                )}
              </div>
              
              {stats.completedSchedules > 0 && (
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.showCompleted}
                    onChange={(e) => setFilters(prev => ({ ...prev, showCompleted: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Show departed schedules</span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Filters - Premium Design */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 mb-6 border-2 border-white/60">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Filter className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-lg">Filters</span>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <select
                value={filters.busType}
                onChange={(e) => setFilters(prev => ({ ...prev, busType: e.target.value }))}
                className="px-4 py-3 border-2 border-gray-300 rounded-xl font-medium text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white shadow-sm hover:shadow-md sm:w-48"
              >
                <option value="all">All Bus Types</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="luxury">Luxury</option>
              </select>

              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="px-4 py-3 border-2 border-gray-300 rounded-xl font-medium text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white shadow-sm hover:shadow-md sm:w-48"
              >
                <option value="departure">Sort by Departure</option>
                <option value="fare">Sort by Fare</option>
                <option value="duration">Sort by Duration</option>
              </select>
            </div>
          </div>
        </div>

        {/* Warning for departing soon schedules */}
        {stats.departingSoonSchedules > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-800 font-medium">
                {stats.departingSoonSchedules} schedule{stats.departingSoonSchedules !== 1 ? 's' : ''} {stats.departingSoonSchedules !== 1 ? 'are' : 'is'} departing within 30 minutes
              </p>
            </div>
          </div>
        )}

        {/* Results - Premium Design */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 md:p-8 border-2 border-white/60">
          <ScheduleList
            schedules={filteredSchedules}
            loading={loading}
            onSelectSchedule={handleSelectSchedule}
            isScheduleCompleted={isScheduleCompleted}
            isScheduleDepartingSoon={isScheduleDepartingSoon}
          />
        </div>

        {/* No Results Message */}
        {!loading && filteredSchedules.length === 0 && (
          <div className="text-center py-8">
            {schedules.length === 0 ? (
              <>
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No schedules found</h3>
                <p className="text-gray-600 mb-4">
                  We couldn't find any schedules matching your search criteria.
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-2">No schedules match your current filters.</p>
                <button
                  onClick={() => setFilters({ busType: 'all', sortBy: 'departure', showCompleted: false })}
                  className="btn-outline mt-2"
                >
                  Clear Filters
                </button>
              </>
            )}
            <button
              onClick={() => navigate('/search')}
              className="btn-primary mt-4"
            >
              Search Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ScheduleResults