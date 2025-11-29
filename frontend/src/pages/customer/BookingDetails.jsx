import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  MapPin,
  Calendar,
  Clock,
  User,
  Bus,
  Package,
  CreditCard,
  Printer,
  Download,
  Shield,
  Ticket,
  Navigation,
  Mail,
  Phone,
  Luggage,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react'
import { bookingService, debugBookingAccess } from '../../services/bookingService'
import { formatDate, formatCurrency, formatTime } from '../../utils/helpers'
import { toast } from 'react-toastify'
import LiveTrackingCard from '../../components/tracking/LiveTrackingCard'

const BookingDetails = () => {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [journeyProgress, setJourneyProgress] = useState(0)
  const [journeyStatus, setJourneyStatus] = useState('not_started') // not_started, in_progress, completed

  useEffect(() => {
    loadBookingDetails()
  }, [bookingId])

  const loadBookingDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      setRefreshing(true)
      
      console.log('📋 Loading booking details for:', bookingId)

      // Debug localStorage
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      console.log('🔐 Auth Debug:', {
        token: token ? `Exists (${token.length} chars)` : 'MISSING',
        user: user ? 'Exists' : 'MISSING'
      });

      const bookingData = await bookingService.getBookingDetails(bookingId)
      
      // COMPREHENSIVE DEBUGGING
      console.log('=== 🔍 FULL BOOKING DATA DEBUG ===')
      console.log('✅ Complete booking data:', bookingData)
      console.log('📋 All keys in bookingData:', Object.keys(bookingData))
      
      // Check specific problematic fields
      console.log('🔍 PROBLEMATIC FIELDS:')
      console.log('   - arrival_time:', bookingData.arrival_time, 'Type:', typeof bookingData.arrival_time)
      console.log('   - payment_method:', bookingData.payment_method, 'Type:', typeof bookingData.payment_method)
      console.log('   - base_fare:', bookingData.base_fare, 'Type:', typeof bookingData.base_fare)
      
      // Check if fields exist but are empty/falsy
      console.log('🔍 FIELD EXISTENCE CHECK:')
      console.log('   - arrival_time exists:', 'arrival_time' in bookingData)
      console.log('   - payment_method exists:', 'payment_method' in bookingData) 
      console.log('   - base_fare exists:', 'base_fare' in bookingData)
      
      console.log('=== 🎯 END DEBUG ===')

      if (!bookingData) {
        throw new Error('Booking not found')
      }

      setBooking(bookingData)
    } catch (error) {
      console.error('❌ Error loading booking details:', error)
      // Check if it's an auth error
      if (error.message?.includes('401') || error.response?.status === 401) {
        setError({
          title: 'Authentication Required',
          message: 'Please log in to view booking details.',
          suggestion: 'Your session may have expired. Please log in again.',
          type: 'auth'
        })
      } else if (error.message?.includes('404') || error.response?.status === 404) {
        setError({
          title: 'Booking Not Found',
          message: 'We couldn\'t find this booking. It may have been cancelled or you don\'t have permission to view it.',
          suggestion: 'Please check your booking list or contact support if you believe this is an error.',
          type: 'not_found'
        })
      } else {
        setError({
          title: 'Connection Error',
          message: 'Unable to load booking details. Please check your internet connection.',
          suggestion: 'Try refreshing the page or check your network connection.',
          type: 'network'
        })
      }
      toast.error('Failed to load booking details')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Calculate journey progress based on current time
  const calculateJourneyProgress = (travelDate, departureTime, estimatedArrival, scheduleStatus) => {
    if (!travelDate || !departureTime || !estimatedArrival) return { progress: 0, status: 'not_started' }
    
    try {
      const now = new Date()
      const today = new Date(travelDate)
      
      // Parse times
      const [depHours, depMinutes] = departureTime.split(':').map(Number)
      const [arrHours, arrMinutes] = estimatedArrival.split(':').map(Number)
      
      // Create departure and arrival datetime objects
      const departureDateTime = new Date(today)
      departureDateTime.setHours(depHours, depMinutes, 0, 0)
      
      const arrivalDateTime = new Date(today)
      arrivalDateTime.setHours(arrHours, arrMinutes, 0, 0)
      
      // Handle overnight journeys
      if (arrivalDateTime < departureDateTime) {
        arrivalDateTime.setDate(arrivalDateTime.getDate() + 1)
      }
      
      // Check schedule status first - if scheduled, don't start progress
      if (scheduleStatus === 'scheduled' || scheduleStatus === 'boarding') {
        return { progress: 0, status: 'not_started', timeUntilDeparture: departureDateTime - now }
      }
      
      // Calculate progress only if bus has departed
      if (now < departureDateTime) {
        return { progress: 0, status: 'not_started', timeUntilDeparture: departureDateTime - now }
      } else if (now > arrivalDateTime || scheduleStatus === 'completed' || scheduleStatus === 'arrived') {
        return { progress: 100, status: 'completed' }
      } else {
        const totalDuration = arrivalDateTime - departureDateTime
        const elapsed = now - departureDateTime
        const progress = (elapsed / totalDuration) * 100
        
        const remainingTime = arrivalDateTime - now
        const remainingHours = Math.floor(remainingTime / (1000 * 60 * 60))
        const remainingMinutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60))
        
        return { 
          progress: Math.min(Math.max(progress, 0), 100), 
          status: 'in_progress',
          remainingTime: { hours: remainingHours, minutes: remainingMinutes },
          estimatedArrivalDateTime: arrivalDateTime
        }
      }
    } catch (error) {
      console.error('Error calculating journey progress:', error)
      return { progress: 0, status: 'not_started' }
    }
  }

  // Update journey progress periodically
  useEffect(() => {
    if (!booking?.estimated_arrival?.estimated_arrival_time) return
    
    const updateProgress = () => {
      const scheduleStatus = booking?.tracking?.status || 'scheduled'
      const progressData = calculateJourneyProgress(
        booking.travel_date,
        booking.departure_time,
        booking.estimated_arrival.estimated_arrival_time,
        scheduleStatus
      )
      setJourneyProgress(progressData.progress)
      setJourneyStatus(progressData.status)
    }
    
    // Initial update
    updateProgress()
    
    // Update every minute
    const interval = setInterval(updateProgress, 60000)
    
    return () => clearInterval(interval)
  }, [booking])

  // Calculate duration from times
  const calculateDuration = (departureTime, arrivalTime) => {
    if (!departureTime || !arrivalTime) return 'N/A'
    
    try {
      const [depHours, depMinutes] = departureTime.split(':').map(Number)
      const [arrHours, arrMinutes] = arrivalTime.split(':').map(Number)
      
      let depTotal = depHours * 60 + depMinutes
      let arrTotal = arrHours * 60 + arrMinutes
      
      // Handle overnight journeys
      if (arrTotal < depTotal) {
        arrTotal += 24 * 60
      }
      
      const totalMinutes = arrTotal - depTotal
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
      return 'N/A'
    }
  }

  const getStatusConfig = (status) => {
    const statusLower = (status || '').toLowerCase()
    
    const configs = {
      completed: { 
        color: 'bg-green-100 text-green-800 border-green-200', 
        label: 'Completed',
        icon: CheckCircle,
        iconColor: 'text-green-600'
      },
      confirmed: { 
        color: 'bg-blue-100 text-blue-800 border-blue-200', 
        label: 'Confirmed',
        icon: CheckCircle,
        iconColor: 'text-blue-600'
      },
      pending_payment: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        label: 'Pending Payment',
        icon: AlertCircle,
        iconColor: 'text-yellow-600'
      },
      pending: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        label: 'Pending',
        icon: AlertCircle,
        iconColor: 'text-yellow-600'
      },
      cancelled: { 
        color: 'bg-red-100 text-red-800 border-red-200', 
        label: 'Cancelled',
        icon: XCircle,
        iconColor: 'text-red-600'
      },
      checked_in: { 
        color: 'bg-purple-100 text-purple-800 border-purple-200', 
        label: 'Checked In',
        icon: CheckCircle,
        iconColor: 'text-purple-600'
      }
    }
    
    return configs[statusLower] || { 
      color: 'bg-gray-100 text-gray-800 border-gray-200', 
      label: status || 'Unknown',
      icon: AlertCircle,
      iconColor: 'text-gray-600'
    }
  }

  const handlePrintTicket = () => {
    window.print()
  }

  const handleDownloadTicket = async () => {
    if (!booking?.id) return
    
    try {
      toast.info('Preparing your ticket download...')
      // You'll need to implement downloadTicket in your service
      // await ticketService.downloadTicket(booking.id)
      toast.success('Ticket downloaded successfully!')
    } catch (error) {
      toast.error('Failed to download ticket')
    }
  }

  const handleRefresh = () => {
    loadBookingDetails()
  }

  const handleRetry = () => {
    loadBookingDetails()
  }

  // Check if booking is upcoming
  const isUpcoming = () => {
    if (!booking?.travel_date) return false
    const travelDate = new Date(booking.travel_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    travelDate.setHours(0, 0, 0, 0)
    return travelDate >= today
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Your Booking</h3>
          <p className="text-gray-600">Getting your travel details ready...</p>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    const ErrorIcon = error?.type === 'auth' ? Shield : 
                     error?.type === 'not_found' ? Ticket : 
                     AlertCircle
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <ErrorIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{error?.title || 'Booking Not Found'}</h2>
          <p className="text-gray-600 mb-2">{error?.message || 'We couldn\'t find this booking.'}</p>
          {error?.suggestion && (
            <p className="text-gray-500 text-sm mb-6">{error.suggestion}</p>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleRetry}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center space-x-2"
            >
              <RefreshCw className="h-5 w-5" />
              <span>Try Again</span>
            </button>
            <Link 
              to="/my-bookings" 
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-semibold"
            >
              View My Bookings
            </Link>
            {error?.type === 'auth' && (
              <Link 
                to="/login" 
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Log In Again
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(booking.status)
  const StatusIcon = statusConfig.icon
  const duration = calculateDuration(booking.departure_time, booking.arrival_time)
  const upcoming = isUpcoming()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/my-bookings')}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors font-semibold bg-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Bookings</span>
            </button>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors font-semibold bg-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
          
          <div className="text-center lg:text-right">
            <h1 className="text-3xl font-bold text-gray-900">Booking Details</h1>
            <p className="text-gray-600 mt-1 flex items-center justify-center lg:justify-end space-x-2">
              <Ticket className="h-4 w-4" />
              <span>PNR: {booking.pnr_number || 'N/A'}</span>
            </p>
          </div>
        </div>

        {/* Main Booking Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6 text-white">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Navigation className="h-6 w-6" />
                  <h2 className="text-2xl font-bold">
                    {booking.departure_city || 'Unknown'} → {booking.arrival_city || 'Unknown'}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-blue-100">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(booking.travel_date) || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(booking.departure_time) || 'N/A'} - {formatTime(booking.arrival_time) || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>•</span>
                    <span>{duration}</span>
                  </div>
                  {upcoming && (
                    <div className="flex items-center space-x-1 bg-blue-500 px-2 py-1 rounded-full">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs font-medium">Upcoming</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 lg:mt-0">
                <span className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-semibold border-2 ${statusConfig.color}`}>
                  <StatusIcon className={`h-4 w-4 ${statusConfig.iconColor}`} />
                  <span>{statusConfig.label}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Estimated Arrival Banner with Journey Progress */}
            {booking.estimated_arrival && (
              <div className={`rounded-xl p-6 mb-8 text-white shadow-lg transition-all duration-500 ${
                journeyStatus === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                journeyStatus === 'in_progress' ? 'bg-gradient-to-r from-orange-500 to-red-600' :
                'bg-gradient-to-r from-blue-500 to-indigo-600'
              }`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="bg-white/20 p-3 rounded-full">
                      {journeyStatus === 'completed' ? (
                        <CheckCircle className="h-8 w-8" />
                      ) : journeyStatus === 'in_progress' ? (
                        <Navigation className="h-8 w-8 animate-pulse" />
                      ) : (
                        <Clock className="h-8 w-8" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        {journeyStatus === 'completed' ? 'Journey Completed!' :
                         journeyStatus === 'in_progress' ? 'Journey In Progress' :
                         'Estimated Arrival Time'}
                      </h3>
                      <p className="text-white/80 text-sm">
                        {booking.route_info?.distance_km} km journey
                        {journeyStatus === 'in_progress' && (() => {
                          const scheduleStatus = booking?.tracking?.status || 'scheduled'
                          const progressData = calculateJourneyProgress(
                            booking.travel_date,
                            booking.departure_time,
                            booking.estimated_arrival.estimated_arrival_time,
                            scheduleStatus
                          )
                          if (progressData.remainingTime) {
                            return ` • ${progressData.remainingTime.hours}h ${progressData.remainingTime.minutes}m remaining`
                          }
                          return ''
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="text-center md:text-right">
                    <div className="text-4xl font-bold mb-1">
                      {booking.estimated_arrival.estimated_arrival_time}
                    </div>
                    <div className="text-white/80 text-sm">
                      Travel time: {booking.formatted_duration}
                    </div>
                    <div className="text-white/70 text-xs mt-1">
                      Average speed: {booking.estimated_arrival.average_speed_kmh} km/h
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                {journeyStatus !== 'not_started' && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-white/80 mb-2">
                      <span>{booking.departure_city}</span>
                      <span className="font-semibold">{Math.round(journeyProgress)}% Complete</span>
                      <span>{booking.arrival_city}</span>
                    </div>
                    <div className="relative h-3 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="absolute h-full bg-white/90 transition-all duration-1000 ease-out rounded-full"
                        style={{ width: `${journeyProgress}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                      </div>
                      {journeyStatus === 'in_progress' && (
                        <div 
                          className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000"
                          style={{ left: `${journeyProgress}%`, transform: 'translate(-50%, -50%)' }}
                        >
                          <div className="bg-white p-1 rounded-full shadow-lg">
                            <Bus className="h-3 w-3 text-blue-600" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Journey and Passenger Info */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
              {/* Journey Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                  Journey Details
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Route</span>
                    <span className="font-semibold text-gray-900">
                      {booking.departure_city} → {booking.arrival_city}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Travel Date</span>
                    <span className="font-semibold text-gray-900">
                      {formatDate(booking.travel_date)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Departure Time</span>
                    <span className="font-semibold text-gray-900">
                      {formatTime(booking.departure_time)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Arrival Time</span>
                    <span className="font-semibold text-gray-900">
                      {formatTime(booking.arrival_time) || 'N/A'}
                    </span>
                  </div>
                  {booking.estimated_arrival && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 bg-blue-50 -mx-6 px-6">
                      <span className="text-blue-700 font-medium flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>Estimated Arrival</span>
                      </span>
                      <span className="font-semibold text-blue-900">
                        {booking.estimated_arrival.estimated_arrival_time}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Duration</span>
                    <span className="font-semibold text-gray-900">
                      {booking.formatted_duration || duration}
                    </span>
                  </div>
                  {booking.route_info?.distance_km && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600 font-medium">Distance</span>
                      <span className="font-semibold text-gray-900">
                        {booking.route_info.distance_km} km
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Passenger Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-green-600" />
                  Passenger Details
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Full Name</span>
                    <span className="font-semibold text-gray-900">
                      {booking.passenger_name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Phone</span>
                    <span className="font-semibold text-gray-900 flex items-center space-x-1">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{booking.passenger_phone}</span>
                    </span>
                  </div>
                  {booking.passenger_email && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-600 font-medium">Email</span>
                      <span className="font-semibold text-gray-900 flex items-center space-x-1">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{booking.passenger_email}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 font-medium">Seat Number</span>
                    <span className="font-semibold text-gray-900">
                      {Array.isArray(booking.seat_numbers) 
                        ? booking.seat_numbers.join(', ') 
                        : booking.seat_numbers}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bus and Payment Info */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
              {/* Bus Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Bus className="h-5 w-5 mr-2 text-purple-600" />
                  Bus Information
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Bus Type</span>
                    <span className="font-semibold text-gray-900 capitalize">
                      {booking.bus_type}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Bus Number</span>
                    <span className="font-semibold text-gray-900">
                      {booking.bus_number}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 font-medium">Operator</span>
                    <span className="font-semibold text-gray-900">
                      {booking.bus_company}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-orange-600" />
                  Payment Details
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Payment Method</span>
                    <span className="font-semibold text-gray-900 capitalize">
                      {booking.payment_method || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Payment Status</span>
                    <span className={`font-semibold capitalize flex items-center space-x-1 ${
                      booking.payment_status === 'paid' ? 'text-green-600' : 
                      booking.payment_status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {booking.payment_status === 'paid' ? <CheckCircle className="h-4 w-4" /> : 
                       booking.payment_status === 'pending' ? <AlertCircle className="h-4 w-4" /> : 
                       <XCircle className="h-4 w-4" />}
                      <span>{booking.payment_status}</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600 font-medium">Booking Date</span>
                    <span className="font-semibold text-gray-900">
                      {formatDate(booking.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 font-medium">Baggage</span>
                    <span className="font-semibold text-gray-900 flex items-center space-x-1">
                      <Luggage className="h-4 w-4 text-gray-400" />
                      <span>{booking.has_baggage ? `${booking.baggage_weight || 15}kg` : 'No baggage'}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2 text-blue-600" />
                Price Breakdown
              </h3>
              <div className="space-y-3 max-w-md mx-auto">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Base Fare</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(booking.base_fare)}
                  </span>
                </div>
                {booking.baggage_fee > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Baggage Fee</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(booking.baggage_fee)}
                    </span>
                  </div>
                )}
                {booking.service_fee > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Service Fee</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(booking.service_fee)}
                    </span>
                  </div>
                )}
                <div className="border-t border-blue-200 pt-3 flex justify-between items-center font-bold text-lg">
                  <span className="text-gray-900">Total Amount</span>
                  <span className="text-green-600">
                    {formatCurrency(booking.total_amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handlePrintTicket}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
              >
                <Printer className="h-5 w-5" />
                <span>Print Ticket</span>
              </button>
              <button
                onClick={handleDownloadTicket}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
              >
                <Download className="h-5 w-5" />
                <span>Download Ticket</span>
              </button>
              {upcoming && booking.status === 'confirmed' && (
                <Link
                  to="/customer/checkin"
                  state={{ booking }}
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-semibold shadow-sm hover:shadow-md text-center"
                >
                  <CheckCircle className="h-5 w-5" />
                  <span>Check-in Online</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Travel Tips */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4 text-lg">Important Travel Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 p-2 rounded-full mt-1">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h5 className="font-semibold text-gray-900 mb-1">Check-in Time</h5>
                <p className="text-gray-600">Arrive at least 30 minutes before departure</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-green-100 p-2 rounded-full mt-1">
                <User className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h5 className="font-semibold text-gray-900 mb-1">ID Requirement</h5>
                <p className="text-gray-600">Bring valid government-issued photo ID</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-purple-100 p-2 rounded-full mt-1">
                <Ticket className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h5 className="font-semibold text-gray-900 mb-1">Boarding Pass</h5>
                <p className="text-gray-600">Keep your PNR ready: <strong>{booking.pnr_number}</strong></p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-orange-100 p-2 rounded-full mt-1">
                <Package className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <h5 className="font-semibold text-gray-900 mb-1">Baggage Policy</h5>
                <p className="text-gray-600">15kg free allowance, additional weight charges apply</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Tracking Card - Show for upcoming/active trips */}
        {upcoming && booking.schedule_id && (
          <div className="mt-8">
            <LiveTrackingCard 
              scheduleId={booking.schedule_id}
              bookingData={{
                pnr_number: booking.pnr_number,
                seat_numbers: booking.seat_numbers
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingDetails