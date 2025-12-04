import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  User, 
  X, 
  Clock,
  Bus,
  Ticket,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  CreditCard,
  Download,
  Eye,
  Info,
  CheckCircle2,
  XCircle as XCircleIcon,
  Send,
  ChevronDown,
  ChevronUp,
  Star,
  Luggage,
  Wifi,
  AirVent,
  Battery
} from 'lucide-react'
import { getRecentActivity } from '../../services/dashboardService'
import { ticketerService } from '../../services/ticketerService'
import { bookingService } from '../../services/bookingService'
import { formatDate, formatCurrency, formatTime } from '../../utils/helpers'
import { toast } from 'react-toastify'
import CancellationRequestModal from '../../components/booking/CancellationRequestModal'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'

const MyBookings = () => {
  const [bookings, setBookings] = useState([])
  const [filteredBookings, setFilteredBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    status: 'all',
    date: 'all'
  })
  const [expandedBooking, setExpandedBooking] = useState(null)
  const [cancellationModal, setCancellationModal] = useState({
    isOpen: false,
    booking: null
  })

  // Configuration
  const CHECK_IN_CONFIG = {
    START_HOURS_BEFORE: 24,
    END_HOURS_BEFORE: 1,
    ENABLED: true
  }

  const CANCELLATION_CONFIG = {
    MIN_HOURS_BEFORE: 3, // Changed from 48 to 3 hours for tiered refund policy
    ENABLED: true
  }

  // Load bookings on component mount
  useEffect(() => {
    loadBookings()
  }, [])

  // Apply filters when bookings, search term or filters change
  useEffect(() => {
    applyFilters()
  }, [bookings, searchTerm, filters])

  // Event listeners for external updates
  useEffect(() => {
    const handleStorageChange = () => {
      loadBookings()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('bookingUpdated', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('bookingUpdated', handleStorageChange)
    }
  }, [])

  const loadBookings = async () => {
    try {
      setLoading(true)
      console.log('🔄 Loading bookings from API...')
      
      const bookingsData = await getRecentActivity()
      console.log('📋 API bookings data:', bookingsData)
      
      let bookingsArray = []
      if (Array.isArray(bookingsData)) {
        bookingsArray = bookingsData
      } else if (bookingsData && Array.isArray(bookingsData.bookings)) {
        bookingsArray = bookingsData.bookings
      } else if (bookingsData && bookingsData.data) {
        bookingsArray = Array.isArray(bookingsData.data) ? bookingsData.data : [bookingsData.data]
      }
      
      console.log('📊 Processed bookings array:', bookingsArray)

      const bookingsWithEnhancedData = bookingsArray.map((booking) => {
        const displayStatus = calculateDisplayStatus(booking)
        
        const busNumber = 
          booking.bus_number ||
          booking.busNumber || 
          booking.bus_no ||
          booking.plate_number ||
          booking.vehicle_number ||
          booking.vehicle_id ||
          null  // Don't set default here, let the display handle it
        
        const busName = 
          booking.bus_name ||
          booking.busName ||
          booking.bus_type ||
          booking.busType ||
          booking.vehicle_type ||
          'Standard Bus'

        const busType = 
          booking.bus_type ||
          booking.busType ||
          'Standard'
        
        // Debug cancellation data
        if (booking.cancellation_requested || booking.cancellation_status) {
          console.log('🔍 Booking with cancellation:', {
            pnr: booking.pnr_number,
            cancellation_requested: booking.cancellation_requested,
            cancellation_status: booking.cancellation_status,
            cancellation_reason: booking.cancellation_reason
          })
        }
        
        return {
          ...booking,
          displayStatus,
          id: booking._id || booking.id,
          bus_number: busNumber,
          bus_name: busName,
          bus_type: busType,
          checkInInfo: calculateCheckInInfo(booking, displayStatus),
          cancellationInfo: calculateCancellationInfo(booking, displayStatus)
        }
      })
      
      setBookings(bookingsWithEnhancedData)
      
    } catch (error) {
      console.error('❌ Failed to load bookings:', error)
      toast.error('Failed to load bookings')
      setBookings([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const refreshBookings = async () => {
    setRefreshing(true)
    await loadBookings()
    toast.success('Bookings refreshed!')
  }

  const toggleBookingExpansion = (bookingId) => {
    setExpandedBooking(expandedBooking === bookingId ? null : bookingId)
  }

  const calculateDisplayStatus = (booking) => {
    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const travelDate = booking.travel_date ? new Date(booking.travel_date) : null
    const paymentStatus = booking.payment_status?.toLowerCase() || 'paid'
    const bookingStatus = booking.status?.toLowerCase() || 'pending'

    if (bookingStatus === 'cancelled' || bookingStatus === 'canceled') {
      return 'cancelled'
    }

    if (bookingStatus === 'refunded') {
      return 'refunded'
    }

    if (bookingStatus === 'checked_in') {
      if (travelDate && booking.departure_time) {
        const departure_dateTime = calculatedeparture_dateTime(booking.travel_date, booking.departure_time)
        if (now > departure_dateTime) {
          return 'completed'
        }
      }
      return 'checked_in'
    }

    if (travelDate && booking.departure_time) {
      const departure_dateTime = calculatedeparture_dateTime(booking.travel_date, booking.departure_time)
      
      if (now > departure_dateTime) {
        return 'completed'
      }

      const normalizedTravelDate = new Date(travelDate)
      normalizedTravelDate.setHours(0, 0, 0, 0)

      const travelTimestamp = normalizedTravelDate.getTime()
      const todayTimestamp = today.getTime()

      if (travelTimestamp > todayTimestamp) {
        return 'upcoming'
      }

      if (travelTimestamp === todayTimestamp) {
        if (now < departure_dateTime) {
          return 'upcoming'
        } else {
          return 'completed'
        }
      }

      if (travelTimestamp < todayTimestamp) {
        return 'completed'
      }
    }

    if (paymentStatus === 'pending' || paymentStatus === 'pending_payment') {
      return 'pending_payment'
    }

    if (bookingStatus === 'pending') {
      return 'pending'
    }

    return bookingStatus
  }

  const calculatedeparture_dateTime = (travelDate, departureTime) => {
    const travelDateObj = new Date(travelDate)
    const [departureHours, departureMinutes] = departureTime.split(':').map(Number)
    
    const departure_dateTime = new Date(travelDateObj)
    departure_dateTime.setHours(departureHours, departureMinutes, 0, 0)
    
    return departure_dateTime
  }

  const calculateCheckInInfo = (booking, displayStatus) => {
    if (booking.status === 'checked_in' || booking.checked_in) {
      return {
        status: 'checked_in',
        eligible: false,
        message: 'Already checked in',
        icon: CheckCircle2,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      }
    }

    // Check if cancellation is pending
    if (booking.cancellation_requested === true && booking.cancellation_status === 'pending') {
      return {
        status: 'cancellation_pending',
        eligible: false,
        message: 'Check-in disabled - Cancellation request pending',
        icon: XCircleIcon,
        color: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-300'
      }
    }

    if (!CHECK_IN_CONFIG.ENABLED) {
      return {
        status: 'disabled',
        eligible: false,
        message: 'Online check-in is currently unavailable',
        icon: XCircleIcon,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200'
      }
    }

    if (displayStatus !== 'upcoming') {
      return {
        status: 'not_eligible',
        eligible: false,
        message: `Check-in not available for ${displayStatus || 'unknown'} bookings`,
        icon: Clock,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      }
    }

    if (booking.payment_status !== 'paid') {
      return {
        status: 'not_paid',
        eligible: false,
        message: 'Complete payment to check-in',
        icon: CreditCard,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      }
    }

    if (!booking.travel_date || !booking.departure_time) {
      return {
        status: 'missing_info',
        eligible: false,
        message: 'Missing travel information',
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      }
    }

    try {
      const now = new Date()
      const travelDate = new Date(booking.travel_date)
      const [departureHours, departureMinutes] = booking.departure_time.split(':').map(Number)
      
      const departure_dateTime = new Date(travelDate)
      departure_dateTime.setHours(departureHours, departureMinutes, 0, 0)
      
      const timeUntilDeparture = departure_dateTime.getTime() - now.getTime()
      const checkInStartMs = CHECK_IN_CONFIG.START_HOURS_BEFORE * 60 * 60 * 1000
      const checkInEndMs = CHECK_IN_CONFIG.END_HOURS_BEFORE * 60 * 60 * 1000
      
      if (timeUntilDeparture <= 0) {
        return {
          status: 'departure_passed',
          eligible: false,
          message: 'Departure time has passed',
          icon: XCircleIcon,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        }
      }

      if (timeUntilDeparture > checkInStartMs) {
        const hoursUntilCheckIn = Math.floor((timeUntilDeparture - checkInStartMs) / (60 * 60 * 1000))
        const minutesUntilCheckIn = Math.floor(((timeUntilDeparture - checkInStartMs) % (60 * 60 * 1000)) / (60 * 1000))
        
        return {
          status: 'pending',
          eligible: false,
          message: `Check-in opens in ${hoursUntilCheckIn}h ${minutesUntilCheckIn}m`,
          timeUntilCheckIn: timeUntilDeparture - checkInStartMs,
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        }
      }

      if (timeUntilDeparture <= checkInEndMs) {
        const minutesUntilDeparture = Math.floor(timeUntilDeparture / (60 * 1000))
        return {
          status: 'closed',
          eligible: false,
          message: `Check-in closed - ${minutesUntilDeparture} min until departure`,
          icon: XCircleIcon,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        }
      }

      const hoursUntilDeparture = Math.floor(timeUntilDeparture / (60 * 60 * 1000))
      const minutesUntilDeparture = Math.floor((timeUntilDeparture % (60 * 60 * 1000)) / (60 * 1000))

      let timeMessage = `Departs in ${hoursUntilDeparture}h ${minutesUntilDeparture}m`
      if (hoursUntilDeparture === 0) {
        timeMessage = `Departs in ${minutesUntilDeparture} minutes`
      }

      return {
        status: 'available',
        eligible: true,
        message: `Check-in available - ${timeMessage}`,
        timeUntilDeparture: timeUntilDeparture,
        icon: CheckCircle2,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      }
      
    } catch (error) {
      console.error('❌ Error calculating check-in eligibility:', error)
      return {
        status: 'error',
        eligible: false,
        message: 'System error calculating check-in time',
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      }
    }
  }

  const calculateCancellationInfo = (booking, displayStatus) => {
    if (!CANCELLATION_CONFIG.ENABLED) {
      return {
        eligible: false,
        message: 'Cancellation is currently unavailable',
        requiresOperatorApproval: true,
        refundPercentage: 0
      }
    }

    // Prevent cancellation if user has already checked in
    if (booking.status === 'checked_in' || booking.checked_in) {
      return {
        eligible: false,
        message: 'Cannot cancel after check-in. Contact support.',
        requiresOperatorApproval: false,
        refundPercentage: 0
      }
    }

    if (!['pending', 'upcoming', 'confirmed'].includes(displayStatus)) {
      return {
        eligible: false,
        message: 'Cannot cancel completed or cancelled bookings',
        requiresOperatorApproval: false,
        refundPercentage: 0
      }
    }

    if (!booking.travel_date || !booking.departure_time) {
      return {
        eligible: false,
        message: 'Missing travel information',
        requiresOperatorApproval: true,
        refundPercentage: 0
      }
    }

    try {
      const now = new Date()
      const travelDate = new Date(booking.travel_date)
      const [departureHours, departureMinutes] = booking.departure_time.split(':').map(Number)
      
      const departure_dateTime = new Date(travelDate)
      departure_dateTime.setHours(departureHours, departureMinutes, 0, 0)
      
      const timeDifference = departure_dateTime.getTime() - now.getTime()
      const hoursUntilDeparture = timeDifference / (60 * 60 * 1000)
      const cancellationDeadlineMs = CANCELLATION_CONFIG.MIN_HOURS_BEFORE * 60 * 60 * 1000
      
      if (timeDifference <= 0) {
        return {
          eligible: false,
          message: 'Departure time has passed',
          requiresOperatorApproval: false,
          refundPercentage: 0
        }
      }

      // Calculate refund percentage based on tiered policy
      let refundPercentage = 0
      let refundTier = ''
      
      if (hoursUntilDeparture >= 48) {
        refundPercentage = 100
        refundTier = '48+ hours - 100% refund'
      } else if (hoursUntilDeparture >= 24) {
        refundPercentage = 70
        refundTier = '24-48 hours - 70% refund'
      } else if (hoursUntilDeparture >= 6) {
        refundPercentage = 50
        refundTier = '6-24 hours - 50% refund'
      } else if (hoursUntilDeparture >= 3) {
        refundPercentage = 30
        refundTier = '3-6 hours - 30% refund'
      } else {
        // Less than 3 hours - cannot cancel
        return {
          eligible: false,
          message: `Too late to cancel (${Math.floor(hoursUntilDeparture)}h ${Math.round((hoursUntilDeparture % 1) * 60)}m until departure)`,
          requiresOperatorApproval: false,
          refundPercentage: 0
        }
      }

      // Can cancel if more than 3 hours before departure
      if (timeDifference > cancellationDeadlineMs) {
        const hours = Math.floor(hoursUntilDeparture)
        const minutes = Math.round((hoursUntilDeparture % 1) * 60)
        
        return {
          eligible: true,
          message: `${refundPercentage}% refund available (${hours}h ${minutes}m until departure)`,
          requiresOperatorApproval: true,
          deadline: departure_dateTime.getTime() - cancellationDeadlineMs,
          refundPercentage: refundPercentage,
          refundTier: refundTier,
          hoursUntilDeparture: hoursUntilDeparture
        }
      } else {
        const hours = Math.floor(hoursUntilDeparture)
        const minutes = Math.round((hoursUntilDeparture % 1) * 60)
        return {
          eligible: false,
          message: `Too late to cancel (${hours}h ${minutes}m until departure)`,
          requiresOperatorApproval: false,
          refundPercentage: 0
        }
      }
      
    } catch (error) {
      console.error('❌ Error calculating cancellation eligibility:', error)
      return {
        eligible: false,
        message: 'System error calculating cancellation',
        requiresOperatorApproval: true,
        refundPercentage: 0
      }
    }
  }

  const getStatusConfig = (status) => {
    const statusLower = status.toLowerCase()
    
    const configs = {
      upcoming: { 
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Clock,
        label: 'Upcoming'
      },
      pending: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Clock,
        label: 'Pending'
      },
      confirmed: { 
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        label: 'Confirmed'
      },
      pending_payment: { 
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: CreditCard,
        label: 'Pending Payment'
      },
      completed: { 
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: CheckCircle,
        label: 'Completed'
      },
      checked_in: { 
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        icon: User,
        label: 'Checked In'
      },
      cancelled: { 
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
        label: 'Cancelled'
      },
      refunded: {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: RefreshCw,
        label: 'Refunded'
      }
    }
    
    return configs[statusLower] || { 
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: AlertCircle,
      label: status?.replace('_', ' ') || 'Unknown'
    }
  }

  const applyFilters = () => {
    let filtered = [...bookings]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.pnr_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.departure_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.arrival_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.passenger_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.bus_number?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (filters.status !== 'all') {
      if (filters.status === 'upcoming') {
        filtered = filtered.filter(booking => 
          calculateDisplayStatus(booking) === 'upcoming'
        )
      } else if (filters.status === 'checked_in') {
        filtered = filtered.filter(booking => 
          calculateDisplayStatus(booking) === 'checked_in'
        )
      } else if (filters.status === 'completed') {
        filtered = filtered.filter(booking => 
          calculateDisplayStatus(booking) === 'completed'
        )
      } else if (filters.status === 'cancelled') {
        filtered = filtered.filter(booking => 
          calculateDisplayStatus(booking) === 'cancelled'
        )
      } else if (filters.status === 'pending') {
        filtered = filtered.filter(booking => 
          ['pending', 'pending_payment'].includes(calculateDisplayStatus(booking))
        )
      }
    }

    // Date filter
    if (filters.date !== 'all') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (filters.date === 'upcoming') {
        filtered = filtered.filter(booking => {
          if (!booking.travel_date) return false
          const travelDate = new Date(booking.travel_date)
          travelDate.setHours(0, 0, 0, 0)
          return travelDate >= today
        })
      } else if (filters.date === 'past') {
        filtered = filtered.filter(booking => {
          if (!booking.travel_date) return false
          const travelDate = new Date(booking.travel_date)
          travelDate.setHours(0, 0, 0, 0)
          return travelDate < today
        })
      }
    }

    // Sort by status priority and date
    filtered.sort((a, b) => {
      const statusPriority = {
        'pending_payment': 1,
        'pending': 2,
        'upcoming': 3,
        'checked_in': 4,
        'confirmed': 5,
        'completed': 6,
        'cancelled': 7,
        'refunded': 8
      }

      const priorityA = statusPriority[calculateDisplayStatus(a)] || 9
      const priorityB = statusPriority[calculateDisplayStatus(b)] || 9

      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }

      const dateA = new Date(a.travel_date || a.created_at || a.booked_at || 0)
      const dateB = new Date(b.travel_date || b.created_at || b.booked_at || 0)
      return dateB - dateA
    })

    setFilteredBookings(filtered)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFilters({
      status: 'all',
      date: 'all'
    })
  }

  // Action helpers
  const canCancelBooking = (booking) => {
    return booking.cancellationInfo?.eligible === true
  }

  const canCheckIn = (booking) => {
    if (!CHECK_IN_CONFIG.ENABLED) return false
    if (booking.status === 'checked_in' || booking.checked_in) return false
    if (booking.payment_status !== 'paid') return false
    if (!booking.travel_date || !booking.departure_time) return false
    // Prevent check-in if cancellation is pending
    if (booking.cancellation_requested === true && booking.cancellation_status === 'pending') return false
    
    try {
      const now = new Date()
      const travelDate = new Date(booking.travel_date)
      const [departureHours, departureMinutes] = booking.departure_time.split(':').map(Number)
      
      const departure_dateTime = new Date(travelDate)
      departure_dateTime.setHours(departureHours, departureMinutes, 0, 0)
      
      const timeUntilDeparture = departure_dateTime.getTime() - now.getTime()
      const checkInStartMs = CHECK_IN_CONFIG.START_HOURS_BEFORE * 60 * 60 * 1000
      const checkInEndMs = CHECK_IN_CONFIG.END_HOURS_BEFORE * 60 * 60 * 1000
      
      return timeUntilDeparture <= checkInStartMs && timeUntilDeparture > checkInEndMs
    } catch (error) {
      console.error('Error in canCheckIn:', error)
      return false
    }
  }

  const canPay = (booking) => {
    return booking.displayStatus === 'pending_payment'
  }

  const canDownloadTicket = (booking) => {
    const downloadableStatuses = ['confirmed', 'upcoming', 'pending', 'checked_in', 'completed']
    return downloadableStatuses.includes(booking.displayStatus)
  }

  // Action handlers
  const handleCancelBooking = async (booking) => {
    if (!booking.cancellationInfo.eligible) {
      toast.error(booking.cancellationInfo.message)
      return
    }

    if (booking.cancellationInfo.requiresOperatorApproval) {
      setCancellationModal({
        isOpen: true,
        booking: booking
      })
    } else {
      if (!window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
        return
      }

      try {
        await bookingService.cancelBooking(booking.id)
        toast.success('Booking cancelled successfully')
        loadBookings()
      } catch (error) {
        console.error('Cancellation failed:', error)
        toast.error('Failed to cancel booking')
      }
    }
  }

  const handleCancellationRequest = async (cancellationData) => {
    try {
      console.log('📤 Sending cancellation request for:', cancellationData.pnrNumber)
      const response = await bookingService.requestCancellation(cancellationData)
      
      // Immediately update the local state to reflect the cancellation request
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.pnr_number === cancellationData.pnrNumber
            ? {
                ...booking,
                cancellation_requested: true,
                cancellation_status: 'pending',
                cancellation_request_date: new Date().toISOString(),
                cancellation_reason: cancellationData.reason
              }
            : booking
        )
      )
      
      toast.success('Cancellation request sent to operator. You will be notified of the decision.')
      
      // Reload to get fresh data from server
      loadBookings()
    } catch (error) {
      console.error('Cancellation request failed:', error)
      throw error
    }
  }

  const closeCancellationModal = () => {
    setCancellationModal({
      isOpen: false,
      booking: null
    })
    // Refresh bookings to update button state
    loadBookings()
  }

  const handlePayNow = (booking) => {
    console.log('Processing payment for:', booking.pnr_number)
    toast.info(`Redirecting to payment for ${booking.pnr_number}...`)
  }

  const handleDownloadTicket = async (booking) => {
    if (!booking) {
      toast.error('Booking information not available')
      return
    }
    
    try {
      console.log('🎫 Generating PDF ticket for:', booking.pnr_number)
      toast.info('Generating PDF ticket...')
      
      // Get seat numbers as string
      const seatNumbers = Array.isArray(booking.seat_numbers) 
        ? booking.seat_numbers.join(', ') 
        : String(booking.seat_numbers || 'N/A')
      
      // Create PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 15
      const contentWidth = pageWidth - (margin * 2)
      let yPos = 20
      
      // Header with blue background
      doc.setFillColor(37, 99, 235)
      doc.rect(0, 0, pageWidth, 35, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('BUS TICKET', pageWidth / 2, 15, { align: 'center' })
      
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('E-Ticket Confirmation', pageWidth / 2, 23, { align: 'center' })
      
      doc.setFontSize(10)
      doc.text(`PNR: ${booking.pnr_number || 'N/A'}`, pageWidth - margin, 30, { align: 'right' })
      
      yPos = 45
      doc.setTextColor(0, 0, 0)
      
      // Journey Route
      doc.setFillColor(248, 250, 252)
      doc.rect(margin, yPos - 5, contentWidth, 25, 'F')
      
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      const fromCity = booking.departure_city || 'N/A'
      const toCity = booking.arrival_city || 'N/A'
      
      doc.text(fromCity, pageWidth / 2 - 30, yPos + 8, { align: 'right' })
      doc.setFontSize(14)
      doc.setFont('helvetica', 'normal')
      doc.text('to', pageWidth / 2, yPos + 8, { align: 'center' })
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(toCity, pageWidth / 2 + 30, yPos + 8, { align: 'left' })
      
      yPos += 30
      
      // Passenger & Journey Details
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('PASSENGER & JOURNEY DETAILS', margin, yPos)
      yPos += 8
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      
      const details = [
        ['Passenger Name:', booking.passenger_name || 'N/A'],
        ['Phone Number:', booking.passenger_phone || 'N/A'],
        ...(booking.passenger_email ? [['Email:', booking.passenger_email]] : []),
        ['Travel Date:', formatDate(booking.travel_date) || 'N/A'],
        ['Departure Time:', formatTime(booking.departure_time) || 'N/A'],
        ['Seat Number(s):', seatNumbers]
      ]
      
      details.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold')
        doc.text(label, margin, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(value, margin + 45, yPos)
        yPos += 6
      })
      
      yPos += 5
      
      // Bus Details
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('BUS DETAILS', margin, yPos)
      yPos += 8
      
      doc.setFillColor(241, 245, 249)
      doc.rect(margin, yPos - 5, contentWidth, 28, 'F')
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      
      const busDetails = [
        ['Bus Type:', booking.bus_type || 'N/A'],
        ['Bus Number:', booking.bus_number || 'N/A'],
        ['Operator:', booking.bus_company || 'Bus Service'],
        ['Baggage:', booking.has_baggage ? `${booking.baggage_weight || 15}kg` : 'No baggage']
      ]
      
      busDetails.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold')
        doc.text(label, margin + 5, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(value, margin + 35, yPos)
        yPos += 6
      })
      
      yPos += 8
      
      // Payment Details
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('PAYMENT DETAILS', margin, yPos)
      yPos += 8
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      
      const paymentDetails = [
        ['Total Amount:', formatCurrency(booking.total_amount) || 'N/A'],
        ['Payment Status:', (booking.payment_status || 'Paid').toUpperCase()],
        ['Booking Date:', formatDate(booking.created_at) || 'N/A']
      ]
      
      paymentDetails.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold')
        doc.text(label, margin, yPos)
        doc.setFont('helvetica', 'normal')
        if (label === 'Total Amount:') {
          doc.setTextColor(22, 163, 74)
        }
        doc.text(value, margin + 45, yPos)
        doc.setTextColor(0, 0, 0)
        yPos += 6
      })
      
      yPos += 5
      
      // Generate QR Code
      try {
        const qrData = JSON.stringify({
          pnr: booking.pnr_number,
          passenger: booking.passenger_name,
          from: booking.departure_city,
          to: booking.arrival_city,
          date: booking.travel_date,
          time: booking.departure_time,
          seats: seatNumbers,
          bookingId: booking.id || booking._id
        })
        
        const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        
        const qrSize = 35
        const qrX = (pageWidth - qrSize) / 2
        doc.addImage(qrCodeDataUrl, 'PNG', qrX, yPos, qrSize, qrSize)
        
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(booking.pnr_number || 'N/A', pageWidth / 2, yPos + qrSize + 5, { align: 'center' })
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.text('Scan QR code for verification', pageWidth / 2, yPos + qrSize + 9, { align: 'center' })
        
        yPos += qrSize + 12
      } catch (qrError) {
        console.warn('QR code generation failed:', qrError)
        yPos += 5
      }
      
      // Dashed line separator
      doc.setLineDash([2, 2])
      doc.setDrawColor(203, 213, 225)
      doc.line(margin, yPos, pageWidth - margin, yPos)
      doc.setLineDash([])
      
      yPos += 8
      
      // Important Instructions
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('IMPORTANT INSTRUCTIONS', margin, yPos)
      yPos += 7
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      
      const instructions = [
        '• Arrive at boarding point 30 minutes before departure',
        '• Carry valid government-issued photo ID',
        '• Present this ticket (printed or digital) at boarding',
        `• Baggage allowance: ${booking.has_baggage ? `${booking.baggage_weight || 15}kg` : 'No baggage'}`,
        `• For queries, contact support with PNR: ${booking.pnr_number}`
      ]
      
      instructions.forEach(instruction => {
        doc.text(instruction, margin + 2, yPos)
        yPos += 5
      })
      
      yPos += 5
      
      // Footer
      doc.setDrawColor(226, 232, 240)
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 6
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(100, 116, 139)
      doc.text('Thank you for choosing our service. Have a safe journey!', pageWidth / 2, yPos, { align: 'center' })
      yPos += 5
      doc.setFontSize(7)
      doc.text('This is a computer-generated ticket. No signature required.', pageWidth / 2, yPos, { align: 'center' })
      yPos += 4
      doc.text(`Booking Reference: ${(booking.id || booking._id).slice(-12)}`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 4
      doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' })
      
      // Save PDF
      const filename = `Ticket-${booking.pnr_number}-${booking.departure_city}-${booking.arrival_city}.pdf`
      doc.save(filename)
      
      console.log('✅ PDF generated successfully')
      toast.success('PDF ticket downloaded successfully!')
      
    } catch (error) {
      console.error('❌ PDF generation error:', error)
      toast.error(`Failed to generate PDF: ${error.message}`)
    }
  }

  const getBusAmenities = (booking) => {
    const amenities = []
    if (booking.has_wifi) amenities.push({ icon: Wifi, label: 'WiFi' })
    if (booking.has_ac) amenities.push({ icon: AirVent, label: 'AC' })
    if (booking.has_charging) amenities.push({ icon: Battery, label: 'Charging' })
    if (booking.has_baggage) amenities.push({ icon: Luggage, label: 'Baggage' })
    return amenities
  }

  // Statistics
  const stats = useMemo(() => {
    const stats = {
      total: bookings.length,
      upcoming: bookings.filter(booking => {
        if (!booking.travel_date || !booking.departure_time) return false
        const departure_dateTime = calculatedeparture_dateTime(booking.travel_date, booking.departure_time)
        return new Date() < departure_dateTime
      }).length,
      checked_in: bookings.filter(booking => 
        booking.status === 'checked_in' || booking.checked_in === true
      ).length,
      completed: bookings.filter(booking => {
        if (!booking.travel_date || !booking.departure_time) return false
        const departure_dateTime = calculatedeparture_dateTime(booking.travel_date, booking.departure_time)
        return new Date() > departure_dateTime
      }).length,
      pending: bookings.filter(booking => 
        booking.payment_status === 'pending' || booking.payment_status === 'pending_payment'
      ).length,
      cancelled: bookings.filter(booking => 
        booking.status === 'cancelled' || booking.status === 'canceled'
      ).length,
      canCheckIn: bookings.filter(booking => canCheckIn(booking)).length
    }

    return stats
  }, [bookings])

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Ticket Pattern Background */}
      <div 
        className="fixed inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='60' viewBox='0 0 100 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%233b82f6' fill-opacity='1'%3E%3Crect x='10' y='15' width='80' height='30' rx='3' stroke='%233b82f6' stroke-width='2' fill='none'/%3E%3Ccircle cx='10' cy='30' r='4' fill='%233b82f6'/%3E%3Ccircle cx='90' cy='30' r='4' fill='%233b82f6'/%3E%3Cline x1='20' y1='22' x2='40' y2='22' stroke='%233b82f6' stroke-width='2'/%3E%3Cline x1='20' y1='30' x2='50' y2='30' stroke='%233b82f6' stroke-width='2'/%3E%3Cline x1='20' y1='38' x2='35' y2='38' stroke='%233b82f6' stroke-width='2'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '120px 80px'
        }}
      ></div>
      
      {/* Floating Shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }}></div>
      </div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Ticket className="h-6 w-6 text-blue-600" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">My Bookings</h1>
            </div>
            <p className="text-gray-600 text-lg">
              Manage and track all your bus journeys in one place
            </p>
          </div>
          <div className="flex items-center space-x-3 mt-4 lg:mt-0">
            <button
              onClick={refreshBookings}
              disabled={refreshing}
              className="flex items-center space-x-2 px-5 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 font-medium text-gray-700 disabled:opacity-50 shadow-sm hover:shadow-md"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-7 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200 col-span-2 lg:col-span-1">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Ticket className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Trips</div>
              </div>
            </div>
          </div>
          
          {[
            { count: stats.upcoming, label: 'Upcoming', color: 'blue', icon: Clock },
            { count: stats.completed, label: 'Completed', color: 'green', icon: CheckCircle },
            { count: stats.pending, label: 'Pending', color: 'orange', icon: Shield },
            { count: stats.cancelled, label: 'Cancelled', color: 'red', icon: XCircle },
            { count: stats.checked_in, label: 'Checked In', color: 'indigo', icon: User },
            { count: stats.canCheckIn, label: 'Can Check-in', color: 'emerald', icon: CheckCircle2 }
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-gray-900">{stat.count}</div>
                  <div className="text-xs text-gray-600 mt-1">{stat.label}</div>
                </div>
                <div className={`w-8 h-8 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`h-4 w-4 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by PNR, route, or passenger name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none cursor-pointer min-w-[140px] text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <select
                value={filters.date}
                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer min-w-[120px] text-sm"
              >
                <option value="all">All Dates</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past Trips</option>
              </select>

              {(searchTerm || filters.status !== 'all' || filters.date !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="flex items-center space-x-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  <X className="h-4 w-4" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {bookings.length === 0 ? 'No Bookings Yet' : 'No Matching Bookings'}
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {bookings.length === 0 
                  ? "You haven't made any bookings yet. Start planning your next adventure!"
                  : "No bookings match your current search and filters. Try adjusting your criteria."
                }
              </p>
              {bookings.length === 0 && (
                <Link 
                  to="/search" 
                  className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
                >
                  <Bus className="h-4 w-4" />
                  <span>Book Your First Trip</span>
                </Link>
              )}
            </div>
          ) : (
            filteredBookings.map((booking) => {
              const statusConfig = getStatusConfig(booking.displayStatus)
              const StatusIcon = statusConfig.icon
              const CheckInIcon = booking.checkInInfo?.icon || Info
              const isExpanded = expandedBooking === booking.id
              const amenities = getBusAmenities(booking)

              return (
                <div key={booking.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-md">
                  {/* Booking Header - Always Visible */}
                  <div 
                    className="p-6 cursor-pointer"
                    onClick={() => toggleBookingExpansion(booking.id)}
                  >
                    <div className="flex items-start justify-between">
                      {/* Main Info */}
                      <div className="flex-1">
                        <div className="flex items-start space-x-4">
                          {/* Route Icon */}
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Bus className="h-6 w-6 text-white" />
                          </div>
                          
                          {/* Route Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {booking.departure_city || 'Unknown'} → {booking.arrival_city || 'Unknown'}
                              </h3>
                              <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                                <StatusIcon className="h-3 w-3" />
                                <span>{statusConfig.label}</span>
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <Ticket className="h-4 w-4" />
                                <span className="font-mono text-xs">{booking.pnr_number || booking.booking_reference || 'No Reference'}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <User className="h-4 w-4" />
                                <span>{booking.passenger_name || 'Unknown'}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(booking.travel_date) || 'Not set'}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>{formatTime(booking.departure_time) || 'Time TBD'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Price and Expand Button */}
                      <div className="flex items-center space-x-4 ml-4">
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900">
                            {formatCurrency(booking.total_amount || booking.base_fare || 0)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Total Amount</p>
                        </div>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 px-6 py-6 bg-gray-50/50">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Details */}
                        <div className="lg:col-span-2 space-y-6">
                          {/* Journey Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Journey Details</h4>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Bus Type</span>
                                  <span className="font-medium text-gray-900">{booking.bus_type || 'Standard'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Bus Number</span>
                                  <span className="font-medium text-gray-900">
                                    {booking.bus_number || booking.plate_number || booking.busNumber || 'Not Assigned'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Seats</span>
                                  <span className="font-medium text-gray-900">
                                    {Array.isArray(booking.seat_numbers) 
                                      ? booking.seat_numbers.join(', ') 
                                      : booking.seat_numbers || 'Not Assigned'
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Payment Details */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Payment Details</h4>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Status</span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    booking.payment_status === 'paid' 
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-orange-100 text-orange-800'
                                  }`}>
                                    {booking.payment_status || 'Unknown'}
                                  </span>
                                </div>
                                {booking.payment_method && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Method</span>
                                    <span className="font-medium text-gray-900 capitalize">{booking.payment_method}</span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Booked On</span>
                                  <span className="font-medium text-gray-900">{formatDate(booking.created_at || booking.booked_at) || 'Unknown'}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Emergency Cancellation Banner */}
                          {booking.cancellation_type === 'emergency' && booking.status === 'cancelled' && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-4">
                              <div className="flex items-start">
                                <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                                <div className="flex-1">
                                  <h4 className="font-bold text-red-900 text-base mb-2">🚨 Emergency Cancellation</h4>
                                  <p className="text-sm text-red-800 font-medium mb-2">
                                    This trip has been cancelled due to an emergency situation.
                                  </p>
                                  {booking.cancellation_reason && (
                                    <div className="bg-white/50 rounded p-3 mb-3">
                                      <p className="text-sm text-red-900">
                                        <strong>Reason:</strong> {booking.cancellation_reason}
                                      </p>
                                    </div>
                                  )}
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <CheckCircle className="h-5 w-5 text-green-600" />
                                      <p className="font-semibold text-green-900 text-sm">100% Refund Processed</p>
                                    </div>
                                    <p className="text-sm text-green-800">
                                      You will receive a full refund of <strong>{formatCurrency(booking.refund_amount || booking.total_amount || 0)}</strong> to your original payment method within 3-5 business days.
                                    </p>
                                  </div>
                                  {booking.cancelled_at && (
                                    <p className="text-xs text-red-600 mt-3">
                                      Cancelled on: {formatDate(booking.cancelled_at)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Regular Cancellation Banner (non-emergency) */}
                          {booking.status === 'cancelled' && booking.cancellation_type !== 'emergency' && (
                            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg mb-4">
                              <div className="flex items-start">
                                <XCircle className="h-6 w-6 text-orange-600 mt-0.5 mr-3 flex-shrink-0" />
                                <div className="flex-1">
                                  <h4 className="font-bold text-orange-900 text-base mb-2">Booking Cancelled</h4>
                                  <p className="text-sm text-orange-800 font-medium mb-2">
                                    This booking has been cancelled.
                                  </p>
                                  {booking.cancellation_reason && (
                                    <div className="bg-white/50 rounded p-3 mb-3">
                                      <p className="text-sm text-orange-900">
                                        <strong>Reason:</strong> {booking.cancellation_reason}
                                      </p>
                                    </div>
                                  )}
                                  {booking.refund_status && (
                                    <div className={`border rounded-lg p-3 mb-3 ${
                                      booking.refund_status === 'refunded' 
                                        ? 'bg-green-50 border-green-200' 
                                        : 'bg-yellow-50 border-yellow-200'
                                    }`}>
                                      <div className="flex items-center space-x-2 mb-2">
                                        {booking.refund_status === 'refunded' ? (
                                          <CheckCircle className="h-5 w-5 text-green-600" />
                                        ) : (
                                          <Clock className="h-5 w-5 text-yellow-600" />
                                        )}
                                        <p className={`font-semibold text-sm ${
                                          booking.refund_status === 'refunded' ? 'text-green-900' : 'text-yellow-900'
                                        }`}>
                                          {booking.refund_status === 'refunded' ? 'Refund Processed' : 'Refund Pending'}
                                        </p>
                                      </div>
                                      <p className={`text-sm ${
                                        booking.refund_status === 'refunded' ? 'text-green-800' : 'text-yellow-800'
                                      }`}>
                                        {booking.refund_status === 'refunded' ? (
                                          <>Refund of <strong>{formatCurrency(booking.refund_amount || booking.total_amount || 0)}</strong> has been processed to your original payment method.</>
                                        ) : (
                                          <>Refund of <strong>{formatCurrency(booking.refund_amount || booking.total_amount || 0)}</strong> is being processed. You will receive it within 3-5 business days.</>
                                        )}
                                      </p>
                                      {booking.refund_percentage && (
                                        <p className="text-xs text-gray-600 mt-2">
                                          Refund percentage: {booking.refund_percentage}%
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  {booking.cancelled_at && (
                                    <p className="text-xs text-orange-600 mt-2">
                                      Cancelled on: {formatDate(booking.cancelled_at)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Cancellation Request Pending Banner */}
                          {booking.cancellation_requested && booking.cancellation_status === 'pending' && (
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-4">
                              <div className="flex items-start">
                                <Clock className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                                <div className="flex-1">
                                  <h4 className="font-semibold text-yellow-900 text-sm">Cancellation Request Submitted</h4>
                                  <p className="text-sm text-yellow-700 mt-1">
                                    Your cancellation request is pending operator review. You will be notified once it's processed.
                                  </p>
                                  {booking.cancellation_reason && (
                                    <p className="text-xs text-yellow-600 mt-2">
                                      <strong>Reason:</strong> {booking.cancellation_reason}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Check-in & Cancellation Status */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Check-in Status */}
                            <div className={`p-4 rounded-lg border ${booking.checkInInfo?.bgColor || 'bg-gray-50'} ${booking.checkInInfo?.borderColor || 'border-gray-200'}`}>
                              <div className="flex items-center space-x-3">
                                <CheckInIcon className={`h-5 w-5 ${booking.checkInInfo?.color || 'text-gray-400'}`} />
                                <div>
                                  <h4 className="font-semibold text-gray-900 text-sm">Check-in Status</h4>
                                  <p className={`text-sm mt-1 ${booking.checkInInfo?.color || 'text-gray-600'}`}>
                                    {booking.checkInInfo?.message || 'Not available'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Cancellation Status */}
                            <div className={`p-4 rounded-lg border ${
                              booking.cancellationInfo?.eligible 
                                ? booking.cancellationInfo.refundPercentage === 100 
                                  ? 'bg-green-50 border-green-200'
                                  : booking.cancellationInfo.refundPercentage >= 50
                                  ? 'bg-blue-50 border-blue-200'
                                  : 'bg-yellow-50 border-yellow-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex items-center space-x-3">
                                <AlertCircle className={`h-5 w-5 ${
                                  booking.cancellationInfo?.eligible 
                                    ? booking.cancellationInfo.refundPercentage === 100
                                      ? 'text-green-600'
                                      : booking.cancellationInfo.refundPercentage >= 50
                                      ? 'text-blue-600'
                                      : 'text-yellow-600'
                                    : 'text-gray-400'
                                }`} />
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 text-sm">Cancellation</h4>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {booking.cancellationInfo?.message || 'Not available'}
                                  </p>
                                  {booking.cancellationInfo?.eligible && booking.cancellationInfo?.refundPercentage > 0 && (
                                    <div className={`mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                      booking.cancellationInfo.refundPercentage === 100
                                        ? 'bg-green-100 text-green-700'
                                        : booking.cancellationInfo.refundPercentage >= 50
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {booking.cancellationInfo.refundPercentage}% Refund
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Bus Amenities */}
                          {amenities.length > 0 && (
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Bus Amenities</h4>
                              <div className="flex flex-wrap gap-2">
                                {amenities.map((amenity, index) => {
                                  const AmenityIcon = amenity.icon
                                  return (
                                    <span key={index} className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                                      <AmenityIcon className="h-3 w-3" />
                                      <span>{amenity.label}</span>
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Column - Actions */}
                        <div className="space-y-4">
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-4 text-sm">Actions</h4>
                            <div className="space-y-3">
                              {/* View Details */}
                              <Link
                                to={`/customer/booking/${booking.id}`}
                                className="flex items-center justify-center space-x-2 w-full px-4 py-2.5 bg-white border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm"
                              >
                                <Eye className="h-4 w-4" />
                                <span>View Details</span>
                              </Link>
                              
                              {/* Download Ticket */}
                              {canDownloadTicket(booking) && (
                                <button
                                  onClick={() => handleDownloadTicket(booking)}
                                  className="flex items-center justify-center space-x-2 w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                                >
                                  <Download className="h-4 w-4" />
                                  <span>Download Ticket</span>
                                </button>
                              )}
                              
                              {/* Pay Now */}
                              {canPay(booking) && (
                                <button
                                  onClick={() => handlePayNow(booking)}
                                  className="flex items-center justify-center space-x-2 w-full px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm"
                                >
                                  <CreditCard className="h-4 w-4" />
                                  <span>Pay Now</span>
                                </button>
                              )}
                              
                              {/* Check-in */}
                              {canCheckIn(booking) ? (
                                <Link
                                  to="/customer/checkin"
                                  state={{ 
                                    booking: {
                                      id: booking.id,
                                      pnr_number: booking.pnr_number,
                                      passenger_name: booking.passenger_name,
                                      departure_city: booking.departure_city,
                                      arrival_city: booking.arrival_city,
                                      travel_date: booking.travel_date,
                                      departure_time: booking.departure_time,
                                      bus_name: booking.bus_name,
                                      bus_number: booking.bus_number,
                                      seat_numbers: booking.seat_numbers,
                                      total_amount: booking.total_amount,
                                      base_fare: booking.base_fare,
                                      payment_status: booking.payment_status,
                                      status: booking.status,
                                      displayStatus: booking.displayStatus
                                    }
                                  }}
                                  className="flex items-center justify-center space-x-2 w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                                >
                                  <User className="h-4 w-4" />
                                  <span>Check-in Online</span>
                                </Link>
                              ) : (
                                booking.displayStatus === 'upcoming' && booking.payment_status === 'paid' && (
                                  <button
                                    disabled
                                    className="flex items-center justify-center space-x-2 w-full px-4 py-2.5 bg-gray-400 text-white rounded-lg cursor-not-allowed font-medium text-sm opacity-50"
                                  >
                                    <User className="h-4 w-4" />
                                    <span>Check-in</span>
                                  </button>
                                )
                              )}
                              
                              {/* Cancel Booking */}
                              {booking.cancellation_requested ? (
                                booking.cancellation_status === 'pending' ? (
                                  <button
                                    disabled
                                    className="flex items-center justify-center space-x-2 w-full px-4 py-2.5 rounded-lg font-medium text-sm bg-yellow-100 text-yellow-800 cursor-not-allowed border border-yellow-300"
                                    title="Cancellation request already submitted and pending review"
                                  >
                                    <Clock className="h-4 w-4" />
                                    <span>Cancellation Pending</span>
                                  </button>
                                ) : booking.cancellation_status === 'approved' ? (
                                  <button
                                    disabled
                                    className="flex items-center justify-center space-x-2 w-full px-4 py-2.5 rounded-lg font-medium text-sm bg-green-100 text-green-800 cursor-not-allowed border border-green-300"
                                    title="Cancellation request has been approved"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    <span>Cancellation Approved</span>
                                  </button>
                                ) : booking.cancellation_status === 'rejected' ? (
                                  <button
                                    disabled
                                    className="flex items-center justify-center space-x-2 w-full px-4 py-2.5 rounded-lg font-medium text-sm bg-red-100 text-red-800 cursor-not-allowed border border-red-300"
                                    title="Cancellation request has been rejected"
                                  >
                                    <XCircle className="h-4 w-4" />
                                    <span>Cancellation Rejected</span>
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    className="flex items-center justify-center space-x-2 w-full px-4 py-2.5 rounded-lg font-medium text-sm bg-gray-300 text-gray-500 cursor-not-allowed"
                                    title="Cancellation request submitted"
                                  >
                                    <Clock className="h-4 w-4" />
                                    <span>Request Submitted</span>
                                  </button>
                                )
                              ) : canCancelBooking(booking) && (
                                <button
                                  onClick={() => handleCancelBooking(booking)}
                                  className={`flex items-center justify-center space-x-2 w-full px-4 py-2.5 rounded-lg font-medium text-sm ${
                                    booking.cancellationInfo.requiresOperatorApproval
                                      ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                      : 'bg-red-600 text-white hover:bg-red-700'
                                  } transition-colors`}
                                >
                                  {booking.cancellationInfo.requiresOperatorApproval ? (
                                    <>
                                      <Send className="h-4 w-4" />
                                      <span>Request Cancel</span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="h-4 w-4" />
                                      <span>Cancel Booking</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Quick Status */}
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-3 text-sm">Quick Status</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Payment</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  booking.payment_status === 'paid' 
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {booking.payment_status || 'Unknown'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Check-in</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  canCheckIn(booking) 
                                    ? 'bg-green-100 text-green-800'
                                    : booking.status === 'checked_in'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {canCheckIn(booking) ? 'Available' : booking.status === 'checked_in' ? 'Done' : 'Not Available'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
  
        <CancellationRequestModal
          isOpen={cancellationModal.isOpen}
          onClose={closeCancellationModal}
          booking={cancellationModal.booking}
          onConfirm={handleCancellationRequest}
        />
  
        {/* Results Count */}
        {!loading && filteredBookings.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm p-4 border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-600">
                Showing {filteredBookings.length} of {bookings.length} bookings
                {stats.canCheckIn > 0 && ` • ${stats.canCheckIn} available for check-in`}
              </p>
              <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                <p className="text-xs text-gray-500">
                  Last updated: {new Date().toLocaleTimeString()}
                </p>
                <button
                  onClick={refreshBookings}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Refresh Now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyBookings