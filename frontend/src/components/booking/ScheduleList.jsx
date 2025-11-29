// src/components/booking/ScheduleList.jsx
import React, { useState, useEffect } from 'react'
import ScheduleCard from './ScheduleCard'
import LoadingSpinner from '../common/LoadingSpinner'
import { scheduleService } from '../../services/scheduleService'
import { Filter, SortAsc, Calendar, Users, AlertCircle, RefreshCw, Clock, Ban, Wrench } from 'lucide-react'

const ScheduleList = ({ 
  originCity, 
  destinationCity, 
  date, 
  passengers = 1,
  onSchedulesLoaded,
  onScheduleSelect 
}) => {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filteredSchedules, setFilteredSchedules] = useState([])
  const [sortBy, setSortBy] = useState('departureTime')
  const [filters, setFilters] = useState({
    busType: 'all',
    priceRange: 'all',
    departureTime: 'all',
    showCompleted: false,
    showMaintenance: false
  })

  console.log('📋 ScheduleList received props:', { 
    originCity, 
    destinationCity, 
    date, 
    passengers,
    hasOnScheduleSelect: !!onScheduleSelect 
  })

  useEffect(() => {
    if (originCity && destinationCity && date) {
      loadSchedules()
    } else {
      setLoading(false)
      setError('Missing search parameters. Please complete your search.')
    }
  }, [originCity, destinationCity, date])

  useEffect(() => {
    if (schedules.length > 0) {
      filterAndSortSchedules()
    }
  }, [schedules, sortBy, filters])

  // Check if a schedule has already departed (past date/time)
 // Check if a schedule has already departed (past date/time)
const isScheduleCompleted = (schedule) => {
  try {
    const now = new Date()
    
    // Handle different date formats from backend - support both old and new field names
    const departure_date = schedule.departure_date || schedule.departure_date
    const departureTime = schedule.departure_time || schedule.departureTime
    
    console.log('⏰ Checking schedule completion:', {
      _id: schedule._id,
      departure_date: departure_date,
      departureTime: departureTime,
      now: now.toString()
    })
    
    if (!departure_date) {
      console.log('❌ No departure date found for schedule:', schedule._id)
      return false // Don't filter out schedules without dates
    }
    
    // Parse the date - handle both string and Date objects
    let scheduleDateTime
    if (departure_date instanceof Date) {
      scheduleDateTime = new Date(departure_date)
    } else {
      // Handle string dates
      const dateStr = departure_date.split('T')[0] // Remove time part if present
      scheduleDateTime = new Date(dateStr)
    }
    
    // Add time if available
    if (departureTime && typeof departureTime === 'string') {
      const [hours, minutes] = departureTime.split(':').map(Number)
      if (!isNaN(hours) && !isNaN(minutes)) {
        scheduleDateTime.setHours(hours, minutes, 0, 0)
      }
    }
    
    // Check if the schedule is in the past
    const isCompleted = scheduleDateTime < now
    
    console.log('⏰ Schedule completion result:', {
      _id: schedule._id,
      scheduleDateTime: scheduleDateTime.toString(),
      now: now.toString(),
      isCompleted: isCompleted
    })
    
    return isCompleted
    
  } catch (error) {
    console.error('❌ Error checking schedule completion:', error, schedule)
    return false // Don't filter out on error
  }
}

  // Check if bus is under maintenance or inactive
// Check if bus is under maintenance or inactive
const isBusUnderMaintenance = (schedule) => {
  try {
    console.log('🔧 Checking bus maintenance for schedule:', schedule._id)
    
    const busStatus = schedule.bus?.status || schedule.bus_status || schedule.status || 'active'
    const isActive = schedule.bus?.isActive !== false && schedule.bus_isActive !== false
    
    const isUnderMaintenance = 
      busStatus.toLowerCase() === 'maintenance' || 
      busStatus.toLowerCase() === 'inactive' ||
      busStatus.toLowerCase() === 'under_maintenance' ||
      !isActive
    
    console.log('🔧 Bus maintenance result:', {
      _id: schedule._id,
      busStatus: busStatus,
      isActive: isActive,
      isUnderMaintenance: isUnderMaintenance
    })
    
    return isUnderMaintenance
    
  } catch (error) {
    console.error('❌ Error checking bus maintenance:', error)
    return false // Assume not under maintenance on error
  }
}

  // Check if a schedule is departing soon (within 30 minutes)
  const isScheduleDepartingSoon = (schedule) => {
    try {
      const now = new Date()
      const scheduleDate = new Date(schedule.departure_date || date)
      const scheduleTime = schedule.departureTime || schedule.departure_time
      
      if (!scheduleTime) return false
      
      const [hours, minutes] = scheduleTime.split(':').map(Number)
      const scheduleDateTime = new Date(scheduleDate)
      scheduleDateTime.setHours(hours, minutes, 0, 0)
      
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60000)
      
      return scheduleDateTime > now && scheduleDateTime <= thirtyMinutesFromNow
    } catch (error) {
      console.error('Error checking departing soon:', error)
      return false
    }
  }

  const loadSchedules = async () => {
  try {
    setLoading(true)
    setError(null)
    console.log('🔍 Loading schedules with:', { originCity, destinationCity, date })
    
    const response = await scheduleService.searchSchedules({
      originCity,
      destinationCity, 
      date
    })
    
    console.log('✅ Schedules API response:', response)
    
    // ADD THESE DEBUG LOGS:
    console.log('🔍 DEBUG - Response structure:', {
      success: response.success,
      schedulesCount: response.schedules?.length,
      total: response.total,
      message: response.message
    })
    
    if (response.schedules && response.schedules.length > 0) {
      console.log('🔍 DEBUG - First schedule:', {
        _id: response.schedules[0]._id,
        originCity: response.schedules[0].originCity,
        destinationCity: response.schedules[0].destinationCity,
        departure_date: response.schedules[0].departure_date,
        departureTime: response.schedules[0].departureTime,
        fareBirr: response.schedules[0].fareBirr,
        availableSeats: response.schedules[0].availableSeats,
        bus: response.schedules[0].bus,
        status: response.schedules[0].status
      })
      
      // Check if schedules are being filtered out
      const completedSchedules = response.schedules.filter(isScheduleCompleted)
      const maintenanceSchedules = response.schedules.filter(isBusUnderMaintenance)
      const availableSchedules = response.schedules.filter(schedule => 
        !isScheduleCompleted(schedule) && !isBusUnderMaintenance(schedule)
      )
      
      console.log('🔍 DEBUG - Filtering results:', {
        total: response.schedules.length,
        completed: completedSchedules.length,
        maintenance: maintenanceSchedules.length,
        available: availableSchedules.length
      })
      
      if (availableSchedules.length === 0 && response.schedules.length > 0) {
        console.log('⚠️ WARNING: All schedules are being filtered out!')
        console.log('🔍 Why schedules are being filtered:')
        response.schedules.forEach((schedule, index) => {
          const completed = isScheduleCompleted(schedule)
          const maintenance = isBusUnderMaintenance(schedule)
          console.log(`Schedule ${index + 1}:`, {
            _id: schedule._id,
            departure_date: schedule.departure_date,
            departureTime: schedule.departureTime,
            isCompleted: completed,
            isUnderMaintenance: maintenance,
            busStatus: schedule.bus?.status,
            scheduleStatus: schedule.status
          })
        })
      }
    }
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to load schedules')
    }
    
    const schedulesData = response.schedules || []
    setSchedules(schedulesData)
    
    // Notify parent component about available schedules count
    if (onSchedulesLoaded) {
      const availableSchedules = schedulesData.filter(schedule => 
        !isScheduleCompleted(schedule) && !isBusUnderMaintenance(schedule)
      ).length
      onSchedulesLoaded(availableSchedules)
    }
    
  } catch (err) {
    console.error('❌ Error loading schedules:', err)
    const errorMessage = err.response?.data?.message || err.message || 'Failed to load schedules. Please try again.'
    setError(errorMessage)
    setSchedules([])
    if (onSchedulesLoaded) {
      onSchedulesLoaded(0)
    }
  } finally {
    setLoading(false)
  }
}

  const filterAndSortSchedules = () => {
    let filtered = [...schedules]

    // Filter out completed schedules (past departure) unless explicitly shown
    if (!filters.showCompleted) {
      filtered = filtered.filter(schedule => !isScheduleCompleted(schedule))
    }

    // Filter out buses under maintenance unless explicitly shown
    if (!filters.showMaintenance) {
      filtered = filtered.filter(schedule => !isBusUnderMaintenance(schedule))
    }

    // Apply other filters
    if (filters.busType !== 'all') {
      filtered = filtered.filter(schedule => {
        const scheduleBusType = schedule.bus?.type || schedule.busType
        return scheduleBusType?.toLowerCase() === filters.busType.toLowerCase()
      })
    }

    if (filters.priceRange !== 'all') {
      const price = parseInt(filters.priceRange)
      filtered = filtered.filter(schedule => {
        const schedulePrice = schedule.fareBirr || schedule.price || 0
        return schedulePrice <= price
      })
    }

    if (filters.departureTime !== 'all') {
      const [start, end] = filters.departureTime.split('-')
      filtered = filtered.filter(schedule => {
        const scheduleTime = schedule.departureTime || schedule.departure_time
        if (!scheduleTime) return false
        
        const timeNumber = parseInt(scheduleTime.replace(':', ''))
        return timeNumber >= parseInt(start) && timeNumber <= parseInt(end)
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          const priceA = a.fareBirr || a.price || 0
          const priceB = b.fareBirr || b.price || 0
          return priceA - priceB
          
        case 'duration':
          const durationA = parseDuration(a.duration)
          const durationB = parseDuration(b.duration)
          return durationA - durationB
          
        case 'departureTime':
        default:
          const timeA = a.departureTime || a.departure_time || ''
          const timeB = b.departureTime || b.departure_time || ''
          return timeA.localeCompare(timeB)
      }
    })

    setFilteredSchedules(filtered)
  }

  // Helper function to parse duration strings like "4h 30m" to minutes
  const parseDuration = (duration) => {
    if (!duration) return 0
    try {
      const hoursMatch = duration.match(/(\d+)h/)
      const minutesMatch = duration.match(/(\d+)m/)
      const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0
      const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0
      return hours * 60 + minutes
    } catch (error) {
      return 0
    }
  }

  const handleScheduleSelect = (schedule) => {
    // Check if schedule has already departed
    if (isScheduleCompleted(schedule)) {
      console.log('❌ Cannot select completed schedule:', schedule)
      alert('This schedule has already departed. Please select another schedule.')
      return
    }

    // Check if bus is under maintenance
    if (isBusUnderMaintenance(schedule)) {
      console.log('❌ Cannot select schedule with bus under maintenance:', schedule)
      alert('This bus is currently under maintenance. Please select another schedule.')
      return
    }

    // Check if there are available seats
    const availableSeats = schedule.availableSeats || schedule.seatsAvailable || 0
    if (availableSeats === 0) {
      console.log('❌ Cannot select sold out schedule:', schedule)
      alert('This schedule is fully booked. Please select another schedule.')
      return
    }

    if (availableSeats < passengers) {
      console.log('❌ Not enough seats available:', { availableSeats, passengers })
      alert(`Only ${availableSeats} seat${availableSeats !== 1 ? 's' : ''} available, but you need ${passengers}. Please select another schedule.`)
      return
    }

    console.log('🚌 Schedule selected in ScheduleList:', {
      schedule,
      passengers,
      totalPassengers: passengers
    })

    if (onScheduleSelect) {
      onScheduleSelect(schedule)
    } else {
      console.error('❌ onScheduleSelect function not provided to ScheduleList')
      alert('Cannot proceed to seat selection. Please try again.')
    }
  }

  const handleRetry = () => {
    loadSchedules()
  }

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
  }

  // Get statistics for display
  const getScheduleStats = () => {
    const totalSchedules = schedules.length
    const completedSchedules = schedules.filter(isScheduleCompleted).length
    const maintenanceSchedules = schedules.filter(isBusUnderMaintenance).length
    const availableSchedules = schedules.filter(schedule => 
      !isScheduleCompleted(schedule) && !isBusUnderMaintenance(schedule)
    ).length
    const departingSoonSchedules = schedules.filter(isScheduleDepartingSoon).length

    return { 
      totalSchedules, 
      completedSchedules, 
      maintenanceSchedules,
      availableSchedules, 
      departingSoonSchedules 
    }
  }

  const stats = getScheduleStats()

  // Format date for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'Invalid date'
    try {
      const date = new Date(dateString)
      return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch (error) {
      return 'Invalid date'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner text="Searching for available schedules..." size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">Unable to Load Schedules</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">{error}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onClick={handleRetry}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-semibold"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  // Enhanced no schedules available message
  if (!schedules || schedules.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="text-gray-400 text-8xl mb-6">🚌</div>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">No Schedules Available</h3>
        <p className="text-gray-600 mb-6 text-lg max-w-md mx-auto">
          We couldn't find any bus schedules for <strong>{originCity} → {destinationCity}</strong> on <strong>{formatDisplayDate(date)}</strong>
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto mb-6">
          <h4 className="font-semibold text-blue-900 mb-3 flex items-center justify-center">
            <Calendar className="h-5 w-5 mr-2" />
            Suggestions
          </h4>
          <ul className="text-sm text-blue-800 space-y-2 text-left">
            <li>• Try searching for a different date</li>
            <li>• Check nearby departure cities</li>
            <li>• Contact customer support for assistance</li>
            <li>• Try different travel times</li>
          </ul>
        </div>

        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
          <p className="font-medium mb-2">Search Details:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-left">
              <span className="font-semibold">Route:</span> {originCity} → {destinationCity}
            </div>
            <div className="text-left">
              <span className="font-semibold">Date:</span> {formatDisplayDate(date)}
            </div>
            <div className="text-left">
              <span className="font-semibold">Passengers:</span> {passengers}
            </div>
            <div className="text-left">
              <span className="font-semibold">Results:</span> 0 schedules
            </div>
          </div>
        </div>
      </div>
    )
  }

  const displaySchedules = filteredSchedules.length > 0 ? filteredSchedules : schedules
  const availableDisplaySchedules = displaySchedules.filter(schedule => 
    !isScheduleCompleted(schedule) && !isBusUnderMaintenance(schedule)
  )

  return (
    <div className="space-y-6">
      {/* Header and Controls - Enhanced */}
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border-2 border-white/60">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Available Schedules
              <span className="ml-2 text-lg font-normal text-blue-600">
                ({availableDisplaySchedules.length} of {stats.availableSchedules} available)
              </span>
            </h2>
            <p className="text-gray-700 mt-1 font-medium">
              Select a schedule to choose seats for {passengers} {passengers === 1 ? 'passenger' : 'passengers'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Sort Dropdown - Enhanced */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl pl-10 pr-8 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer font-semibold text-gray-700 hover:border-blue-300 transition-all"
              >
                <option value="departureTime">Sort by: Departure Time</option>
                <option value="price">Sort by: Price (Low to High)</option>
                <option value="duration">Sort by: Duration</option>
              </select>
              <SortAsc className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-600" />
            </div>

            {/* Filter Dropdown - Enhanced */}
            <div className="relative">
              <select
                value={filters.busType}
                onChange={(e) => handleFilterChange('busType', e.target.value)}
                className="appearance-none bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl pl-10 pr-8 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 cursor-pointer font-semibold text-gray-700 hover:border-purple-300 transition-all"
              >
                <option value="all">All Bus Types</option>
                <option value="luxury">Luxury</option>
                <option value="premium">Premium</option>
                <option value="standard">Standard</option>
              </select>
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Enhanced Schedule Statistics */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
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
              {stats.maintenanceSchedules > 0 && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">
                    {stats.maintenanceSchedules} Under Maintenance
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-4">
              {stats.completedSchedules > 0 && (
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.showCompleted}
                    onChange={(e) => setFilters(prev => ({ ...prev, showCompleted: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Show departed</span>
                </label>
              )}
              {stats.maintenanceSchedules > 0 && (
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.showMaintenance}
                    onChange={(e) => setFilters(prev => ({ ...prev, showMaintenance: e.target.checked }))}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Show maintenance</span>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {(filters.busType !== 'all' || filters.priceRange !== 'all' || filters.departureTime !== 'all') && (
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-600">Active filters:</span>
            {filters.busType !== 'all' && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                {filters.busType} Bus
              </span>
            )}
            {filters.priceRange !== 'all' && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                Under {filters.priceRange} ETB
              </span>
            )}
            {filters.departureTime !== 'all' && (
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                {filters.departureTime.replace('-', ' to ')}
              </span>
            )}
            <button
              onClick={() => setFilters({ 
                busType: 'all', 
                priceRange: 'all', 
                departureTime: 'all', 
                showCompleted: false,
                showMaintenance: false 
              })}
              className="text-red-600 hover:text-red-700 text-xs font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Warning for departing soon schedules */}
      {stats.departingSoonSchedules > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-800 font-medium">
              {stats.departingSoonSchedules} schedule{stats.departingSoonSchedules !== 1 ? 's' : ''} {stats.departingSoonSchedules !== 1 ? 'are' : 'is'} departing within 30 minutes
            </p>
          </div>
        </div>
      )}

      {/* Warning for maintenance schedules */}
      {stats.maintenanceSchedules > 0 && !filters.showMaintenance && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Wrench className="h-5 w-5 text-orange-600" />
            <p className="text-orange-800 font-medium">
              {stats.maintenanceSchedules} schedule{stats.maintenanceSchedules !== 1 ? 's' : ''} {stats.maintenanceSchedules !== 1 ? 'are' : 'is'} under maintenance and hidden
            </p>
          </div>
        </div>
      )}

      {/* Schedules List */}
      <div className="space-y-4">
        {displaySchedules.map(schedule => {
          const completed = isScheduleCompleted(schedule)
          const underMaintenance = isBusUnderMaintenance(schedule)
          const departingSoon = isScheduleDepartingSoon(schedule)
          
          return (
            <ScheduleCard
              key={schedule._id}
              schedule={schedule}
              passengers={passengers}
              onSelect={() => handleScheduleSelect(schedule)}
              isCompleted={completed}
              isUnderMaintenance={underMaintenance}
              isDepartingSoon={departingSoon}
            />
          )
        })}
      </div>

      {/* Enhanced Results Summary */}
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-600 text-sm">
          Showing {availableDisplaySchedules.length} of {stats.availableSchedules} available schedules • 
          {' '}{passengers} {passengers === 1 ? 'passenger' : 'passengers'} • 
          {' '}Select a schedule to continue to seat selection
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-2 text-xs">
          {stats.completedSchedules > 0 && !filters.showCompleted && (
            <p className="text-red-600">
              {stats.completedSchedules} departed schedule{stats.completedSchedules !== 1 ? 's' : ''} hidden
            </p>
          )}
          {stats.maintenanceSchedules > 0 && !filters.showMaintenance && (
            <p className="text-orange-600">
              {stats.maintenanceSchedules} maintenance schedule{stats.maintenanceSchedules !== 1 ? 's' : ''} hidden
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ScheduleList