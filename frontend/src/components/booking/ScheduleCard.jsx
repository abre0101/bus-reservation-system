// src/components/booking/ScheduleCard.jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Users, MapPin, AlertCircle, Ban, Bus, Wrench, Calendar } from 'lucide-react'

const ScheduleCard = ({ 
  schedule, 
  onSelect, 
  isCompleted = false,
  isUnderMaintenance = false,
  isDepartingSoon = false,
  passengers = 1 
}) => {
  const navigate = useNavigate()

  // Add debug logging to see what data we're receiving
  console.log('🎫 ScheduleCard received schedule:', schedule)
  console.log('🔍 ScheduleCard status flags:', {
    isCompleted,
    isUnderMaintenance,
    isDepartingSoon,
    passengers
  })

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available'
    
    try {
      const date = new Date(dateString)
      return isNaN(date.getTime()) 
        ? 'Date not set' 
        : date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
    } catch (error) {
      console.error('❌ Date formatting error:', error)
      return 'Date error'
    }
  }

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return 'Time not available'
    
    try {
      // Handle time strings like "08:00"
      const [hours, minutes] = timeString.split(':')
      const date = new Date()
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch (error) {
      console.error('❌ Time formatting error:', error)
      return 'Time error'
    }
  }

  // Calculate duration between departure and arrival
  const calculateDuration = (departureTime, arrivalTime) => {
    if (!departureTime || !arrivalTime) return 'N/A'
    
    try {
      const [depHours, depMinutes] = departureTime.split(':').map(Number)
      const [arrHours, arrMinutes] = arrivalTime.split(':').map(Number)
      
      let totalMinutes = (arrHours * 60 + arrMinutes) - (depHours * 60 + depMinutes)
      
      // Handle overnight trips
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
      console.error('❌ Duration calculation error:', error)
      return 'N/A'
    }
  }

  const handleSelectSeats = () => {
    console.log('🎫 ScheduleCard handleSelectSeats called with:', {
      scheduleId: schedule._id,
      isCompleted,
      isUnderMaintenance,
      availableSeats
    })

    // Prevent selection if schedule is completed
    if (isCompleted) {
      console.log('❌ Cannot select completed schedule:', schedule)
      alert('This schedule has already departed. Please select another schedule.')
      return
    }

    // Prevent selection if bus is under maintenance
    if (isUnderMaintenance) {
      console.log('❌ Cannot select schedule with bus under maintenance:', schedule)
      alert('This bus is currently under maintenance. Please select another schedule.')
      return
    }

    // Prevent selection if no seats available
    if (availableSeats === 0) {
      console.log('❌ Cannot select sold out schedule:', schedule)
      alert('This schedule is fully booked. Please select another schedule.')
      return
    }

    console.log('🎫 Selecting seats for schedule:', schedule)
    
    // Use the schedule data - support both old and new field names
    const scheduleData = {
      // Core identifiers
      _id: schedule._id || schedule.id,
      route_id: schedule.route_id || schedule.routeId,
      bus_id: schedule.bus_id || schedule.busId,
      
      // Route information - support both field name formats
      origin_city: schedule.origin_city || schedule.originCity || schedule.departure_city,
      destination_city: schedule.destination_city || schedule.destinationCity || schedule.arrival_city,
      originCity: schedule.origin_city || schedule.originCity,
      destinationCity: schedule.destination_city || schedule.destinationCity,
      
      // Date and time - support both formats
      departure_date: schedule.departure_date || schedule.departure_date,
      departure_time: schedule.departure_time || schedule.departureTime,
      arrival_time: schedule.arrival_time || schedule.arrivalTime,
      departure_date: schedule.departure_date || schedule.departure_date,
      departureTime: schedule.departure_time || schedule.departureTime,
      arrivalTime: schedule.arrival_time || schedule.arrivalTime,
      
      // Pricing - support both field names
      fare_birr: schedule.fare_birr || schedule.fareBirr || schedule.price,
      price: schedule.fare_birr || schedule.fareBirr || schedule.price,
      
      // Bus information
      bus: schedule.bus || {
        _id: schedule.bus_id || schedule.busId,
        name: schedule.bus_name || `EthioBus ${schedule.bus_type || schedule.busType}`,
        type: schedule.bus_type || schedule.busType,
        number: schedule.bus_number || schedule.busNumber,
        plate_number: schedule.plate_number,
        capacity: schedule.bus_capacity || 45,
        status: schedule.bus_status || 'active'
      },
      bus_type: schedule.bus_type || schedule.busType,
      bus_number: schedule.bus_number || schedule.busNumber,
      plate_number: schedule.plate_number,
      
      // Availability
      available_seats: schedule.available_seats || schedule.availableSeats,
      total_seats: schedule.total_seats || schedule.totalSeats,
      
      // Additional fields
      status: schedule.status,
      amenities: schedule.amenities || [],
      duration: schedule.duration || calculateDuration(schedule.departure_time || schedule.departureTime, schedule.arrival_time || schedule.arrivalTime),
      driver_name: schedule.driver_name,
      
      // Additional route info
      route_name: schedule.route_name,
      distanceKm: schedule.distanceKm,
      estimatedDurationHours: schedule.estimatedDurationHours,
      stops: schedule.stops
    }

    console.log('🚀 Navigating to seat selection with:', scheduleData)

    // Navigate to seat selection page with schedule data
    navigate('/booking/seats', { 
      state: { 
        schedule: scheduleData,
        passengerCount: passengers
      }
    })

    // Call the onSelect callback if provided
    if (onSelect) {
      onSelect(schedule)
    }
  }

  // Extract data with proper fallbacks - support both old and new field names
  const departure_date = schedule.departure_date || schedule.departure_date
  const departureTime = schedule.departure_time || schedule.departureTime
  const arrivalTime = schedule.arrival_time || schedule.arrivalTime
  const price = schedule.fare_birr || schedule.fareBirr || schedule.price || 0
  const availableSeats = schedule.available_seats || schedule.availableSeats || 0
  const busName = schedule.bus?.name || schedule.bus_name || `EthioBus ${schedule.bus_type || schedule.busType}` || 'Premium Coach'
  const busType = schedule.bus_type || schedule.busType || schedule.bus?.type || 'Standard'
  const busStatus = schedule.status || schedule.bus_status || schedule.bus?.status || 'scheduled'
  const originCity = schedule.origin_city || schedule.originCity || schedule.departure_city
  const destinationCity = schedule.destination_city || schedule.destinationCity || schedule.arrival_city
  const duration = schedule.duration || calculateDuration(departureTime, arrivalTime)

  // Log extracted data for debugging
  console.log('🔍 ScheduleCard extracted data:', {
    originCity,
    destinationCity,
    departure_date,
    departureTime,
    arrivalTime,
    price,
    availableSeats,
    busName,
    busType,
    busStatus,
    duration
  })

  // Calculate total price for multiple passengers
  const totalPrice = price * passengers

  // Get bus type color classes
  const getBusTypeColor = () => {
    const type = busType.toLowerCase()
    switch (type) {
      case 'luxury':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'premium':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'standard':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'economy':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Get status color classes
  const getStatusColor = () => {
    if (isUnderMaintenance) return 'bg-orange-100 text-orange-800 border-orange-200'
    if (isCompleted) return 'bg-red-100 text-red-800 border-red-200'
    if (isDepartingSoon) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (availableSeats === 0) return 'bg-gray-100 text-gray-800 border-gray-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }

  // Get status text
  const getStatusText = () => {
    if (isUnderMaintenance) return 'Under Maintenance'
    if (isCompleted) return 'Departed'
    if (isDepartingSoon) return 'Departing Soon'
    if (availableSeats === 0) return 'Sold Out'
    return 'Available'
  }

  // Get status icon
  const getStatusIcon = () => {
    if (isUnderMaintenance) return <Wrench className="h-3 w-3 mr-1" />
    if (isCompleted) return <Ban className="h-3 w-3 mr-1" />
    if (isDepartingSoon) return <Clock className="h-3 w-3 mr-1" />
    if (availableSeats === 0) return <Users className="h-3 w-3 mr-1" />
    return null
  }

  // Get button text and style
  const getButtonConfig = () => {
    if (isUnderMaintenance) {
      return {
        text: 'Under Maintenance',
        className: 'bg-orange-400 text-white cursor-not-allowed opacity-60',
        disabled: true
      }
    }
    if (isCompleted) {
      return {
        text: 'Departed',
        className: 'bg-gray-400 text-white cursor-not-allowed opacity-60',
        disabled: true
      }
    }
    if (availableSeats === 0) {
      return {
        text: 'Sold Out',
        className: 'bg-gray-400 text-white cursor-not-allowed opacity-60',
        disabled: true
      }
    }
    if (isDepartingSoon) {
      return {
        text: 'Book Quickly',
        className: 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg hover:shadow-xl',
        disabled: false
      }
    }
    return {
      text: 'Select Seats',
      className: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl',
      disabled: false
    }
  }

  // Get card border and background styles
  const getCardStyles = () => {
    if (isUnderMaintenance) {
      return 'border-orange-300 bg-orange-50 opacity-80'
    }
    if (isCompleted) {
      return 'border-gray-300 bg-gray-50 opacity-70'
    }
    if (isDepartingSoon) {
      return 'border-yellow-300 bg-yellow-50 hover:shadow-xl hover:border-yellow-400'
    }
    if (availableSeats === 0) {
      return 'border-gray-300 bg-gray-50 opacity-80'
    }
    return 'border-gray-200 hover:shadow-xl hover:border-blue-300'
  }

  const buttonConfig = getButtonConfig()

  return (
    <div className={`
      relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border-2 p-6 transition-all duration-300 overflow-hidden group
      ${getCardStyles()}
    `}>
      {/* Gradient accent bar on hover */}
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top"></div>
      
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 bg-[url('https://images.unsplash.com/photo-1715174539960-6b2f5f279ee5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTAwNDR8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMGdlb21ldHJpYyUyMHBhdHRlcm4lMjBncmFkaWVudHxlbnwwfDB8fGJsdWV8MTc2MzQ1NjczOXww&ixlib=rb-4.1.0&q=85')] bg-cover bg-center"></div>
      
      <div className="relative z-10">
      {/* Header with Date and Status - Enhanced */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h3 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent flex items-center">
          <Calendar className="h-6 w-6 mr-2 text-blue-600" />
          {formatDate(departure_date)}
        </h3>
        
        <div className="flex flex-wrap gap-2">
          {/* Bus Type Badge - Enhanced */}
          <span className={`px-4 py-2 rounded-xl text-sm font-bold border-2 shadow-md transition-all duration-200 hover:scale-105 ${getBusTypeColor()}`}>
            {busType.charAt(0).toUpperCase() + busType.slice(1)} Class
          </span>
          
          {/* Status Badge - Enhanced */}
          <span className={`px-4 py-2 rounded-xl text-sm font-bold border-2 flex items-center shadow-md transition-all duration-200 hover:scale-105 ${getStatusColor()}`}>
            {getStatusIcon()}
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Schedule Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4">
        {/* Departure & Arrival */}
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex flex-col items-center mt-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div className="w-0.5 h-8 bg-green-300 my-1"></div>
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="font-bold text-lg text-gray-900">{formatTime(departureTime)}</p>
                <p className="text-gray-600 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {originCity}
                </p>
              </div>
              <div>
                <p className="font-bold text-lg text-gray-900">{formatTime(arrivalTime)}</p>
                <p className="text-gray-600 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {destinationCity}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bus & Seats Info */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-gray-700">
            <Bus className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-semibold">{busName}</p>
              <p className="text-sm text-gray-500">Bus {schedule.busNumber}</p>
              {isUnderMaintenance && (
                <p className="text-xs text-orange-600 font-medium mt-1">
                  Status: {busStatus}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-gray-700">
            <Users className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-semibold">{availableSeats} seats available</p>
              <p className="text-sm text-gray-500">of {schedule.bus?.capacity || schedule.bus_capacity || 45} total</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-gray-700">
            <Clock className="h-5 w-5 text-purple-600" />
            <div>
              <p className="font-semibold">Duration: {duration}</p>
              <p className="text-sm text-gray-500">Travel time</p>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="text-right space-y-2">
          <div>
            <p className={`text-3xl font-bold ${
              isUnderMaintenance || isCompleted ? 'text-gray-500' : 'text-green-600'
            }`}>
              ETB {price.toLocaleString()}
            </p>
            <p className="text-gray-500 text-sm">per passenger</p>
          </div>
          
          {passengers > 1 && (
            <div className="border-t pt-2">
              <p className={`text-lg font-semibold ${
                isUnderMaintenance || isCompleted ? 'text-gray-500' : 'text-gray-900'
              }`}>
                Total: ETB {totalPrice.toLocaleString()}
              </p>
              <p className="text-gray-500 text-sm">
                for {passengers} {passengers === 1 ? 'passenger' : 'passengers'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Warning Messages */}
      {isUnderMaintenance && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-orange-700 text-sm font-medium flex items-center">
            <Wrench className="h-4 w-4 mr-2" />
            This bus is currently under maintenance and unavailable for booking. Please select another schedule.
          </p>
        </div>
      )}

      {isCompleted && !isUnderMaintenance && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            This schedule has already departed. Please select another schedule.
          </p>
        </div>
      )}

      {isDepartingSoon && !isCompleted && !isUnderMaintenance && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm font-medium flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            This schedule is departing within 30 minutes. Please complete booking quickly.
          </p>
        </div>
      )}

      {availableSeats === 0 && !isCompleted && !isUnderMaintenance && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-700 text-sm font-medium flex items-center">
            <Users className="h-4 w-4 mr-2" />
            This schedule is fully booked. Please select another schedule.
          </p>
        </div>
      )}

      {/* Amenities if available */}
      {schedule.amenities && schedule.amenities.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700 text-sm font-medium mb-2">Amenities:</p>
          <div className="flex flex-wrap gap-2">
            {schedule.amenities.map((amenity, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                {amenity}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Button - Enhanced */}
      <div className="flex justify-end border-t pt-6 mt-4">
        <button 
          className={`
            relative px-10 py-4 rounded-xl font-bold text-base transition-all duration-300 
            flex items-center space-x-2 min-w-[160px] justify-center
            shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95
            overflow-hidden
            ${buttonConfig.className}
          `}
          onClick={handleSelectSeats}
          disabled={buttonConfig.disabled}
          title={
            isUnderMaintenance ? 'Bus under maintenance - unavailable' :
            isCompleted ? 'Schedule has departed' :
            availableSeats === 0 ? 'No seats available' :
            isDepartingSoon ? 'Departing soon - book quickly' :
            'Select seats for this schedule'
          }
        >
          {/* Shine effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          <span className="relative z-10">{buttonConfig.text}</span>
          {isDepartingSoon && !buttonConfig.disabled && <Clock className="h-5 w-5 relative z-10" />}
          {isUnderMaintenance && <Wrench className="h-5 w-5 relative z-10" />}
        </button>
      </div>
      </div>
    </div>
  )
}

export default ScheduleCard