import { format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns'

// Baggage fee structure constants
export const BAGGAGE_FEE_STRUCTURE = {
  FREE_ALLOWANCE: 15,      // First 15kg free
  STANDARD_RATE: 50,       // 50 ETB per kg for 16-25kg
  HEAVY_RATE: 100,         // 100 ETB per kg for 26-35kg  
  EXTRA_HEAVY_RATE: 150,   // 150 ETB per kg for 36kg+
  MAX_WEIGHT: 40
}

// Booking helper functions
export const getPassengerName = (booking) => {
  return booking.passenger_name || 'Unknown Passenger'
}

export const getBookingReference = (booking) => {
  return booking.pnr_number || booking._id || 'N/A'
}

export const getPassengerPhone = (booking) => {
  return booking.passenger_phone || 'No phone'
}

export const getPassengerEmail = (booking) => {
  return booking.passenger_email || 'No email'
}

export const getRouteInfo = (booking) => {
  // Use the REAL field names from your data
  return `${booking.departure_city} → ${booking.arrival_city}`
}

export const getDepartureTime = (booking) => {
  // Combine the REAL travel_date and departure_time fields
  if (booking.travel_date && booking.departure_time) {
    return `${booking.travel_date}T${booking.departure_time}`
  }
  return booking.created_at || booking.booked_at
}

export const getSeatNumber = (booking) => {
  // Use the REAL seat_numbers array
  if (booking.seat_numbers && Array.isArray(booking.seat_numbers) && booking.seat_numbers.length > 0) {
    return booking.seat_numbers.join(', ')
  }
  return 'N/A'
}

export const getBusNumber = (booking) => {
  return booking.bus_number || 'N/A'
}

export const getTotalAmount = (booking) => {
  return booking.total_amount || 0
}

export const getPaymentMethod = (booking) => {
  return booking.payment_method || 'Not specified'
}

export const getPaymentStatus = (booking) => {
  return booking.payment_status || 'pending'
}

export const getBusType = (booking) => {
  return booking.bus_type || 'standard'
}

export const getBusCompany = (booking) => {
  return booking.bus_company || 'Unknown Company'
}

// Date and time formatting functions
export const formatDate = (date, formatString = 'PPP') => {
  if (!date) return ''
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, formatString)
  } catch (error) {
    console.error('Date formatting error:', error)
    return 'Invalid Date'
  }
}

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'ETB 0.00'
  }
  
  // Ensure it's a number
  const numAmount = Number(amount)
  
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2
  }).format(numAmount)
}

export const formatTime = (timeString) => {
  if (!timeString) return 'N/A'
  
  try {
    // Handle both "08:00" and "8:00" formats
    const [hours, minutes] = timeString.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  } catch (error) {
    console.error('Error formatting time:', error)
    return timeString // Return original if formatting fails
  }
}

export const formatDateTime = (dateTime) => {
  if (!dateTime) return ''
  try {
    const dateObj = typeof dateTime === 'string' ? parseISO(dateTime) : dateTime
    return format(dateObj, 'PPpp')
  } catch (error) {
    console.error('DateTime formatting error:', error)
    return 'Invalid DateTime'
  }
}

export const calculateDuration = (startTime, endTime) => {
  try {
    const start = parseISO(`1970-01-01T${startTime}`)
    const end = parseISO(`1970-01-01T${endTime}`)
    
    const hours = differenceInHours(end, start)
    const minutes = differenceInMinutes(end, start) % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim()
    }
    return `${minutes}m`
  } catch (error) {
    console.error('Duration calculation error:', error)
    return 'N/A'
  }
}

// Seat management functions
export const generateSeatLayout = (totalSeats, occupiedSeats = []) => {
  const seats = []
  const rows = Math.ceil(totalSeats / 4)
  
  for (let row = 1; row <= rows; row++) {
    const rowSeats = []
    for (let col = 1; col <= 4; col++) {
      const seatNumber = (row - 1) * 4 + col
      if (seatNumber <= totalSeats) {
        rowSeats.push({
          number: seatNumber,
          occupied: occupiedSeats.includes(seatNumber),
          selected: false
        })
      }
    }
    seats.push(rowSeats)
  }
  
  return seats
}

// Baggage fee calculations
export const calculateBaggageFee = (weight) => {
  const { FREE_ALLOWANCE, STANDARD_RATE, HEAVY_RATE, EXTRA_HEAVY_RATE } = BAGGAGE_FEE_STRUCTURE
  
  if (!weight || weight <= 0) return 0
  
  const numericWeight = Number(weight)
  
  if (numericWeight <= FREE_ALLOWANCE) {
    return 0
  }
  
  if (numericWeight <= 25) {
    // 16-25kg: charge for weight beyond free allowance
    const chargeableWeight = numericWeight - FREE_ALLOWANCE
    return chargeableWeight * STANDARD_RATE
  }
  
  if (numericWeight <= 35) {
    // 26-35kg: fixed heavy fee + standard rate for 10kg + extra weight rate
    const standardWeight = 25 - FREE_ALLOWANCE
    const heavyWeight = numericWeight - 25
    return (standardWeight * STANDARD_RATE) + (heavyWeight * HEAVY_RATE)
  }
  
  if (numericWeight <= BAGGAGE_FEE_STRUCTURE.MAX_WEIGHT) {
    // 36-40kg: fixed heavy fee for 10kg + extra heavy for remaining
    const standardWeight = 25 - FREE_ALLOWANCE
    const heavyWeight = 10 // 26-35kg
    const extraHeavyWeight = numericWeight - 35
    return (standardWeight * STANDARD_RATE) + (heavyWeight * HEAVY_RATE) + (extraHeavyWeight * EXTRA_HEAVY_RATE)
  }
  
  // Exceeds max weight
  return 0
}

// Simple tier-based baggage fee calculation (alternative)
export const calculateBaggageFeeSimple = (weight) => {
  if (!weight || weight <= 0) return 0
  
  const numericWeight = Number(weight)
  
  if (numericWeight <= 15) return 0
  if (numericWeight <= 25) return 50
  if (numericWeight <= 35) return 100
  if (numericWeight <= 40) return 150
  return 0 // Exceeds max weight
}

// Per kg calculation (most common approach)
export const calculateBaggageFeePerKg = (weight) => {
  if (!weight || weight <= 0) return 0
  
  const numericWeight = Number(weight)
  const { FREE_ALLOWANCE, STANDARD_RATE } = BAGGAGE_FEE_STRUCTURE
  
  if (numericWeight <= FREE_ALLOWANCE) {
    return 0
  }
  
  const chargeableWeight = numericWeight - FREE_ALLOWANCE
  return chargeableWeight * STANDARD_RATE
}

export const getBaggageFeeBreakdown = (weight) => {
  if (!weight || weight <= 0) {
    return {
      freeAllowance: BAGGAGE_FEE_STRUCTURE.FREE_ALLOWANCE,
      chargeableWeight: 0,
      rate: 0,
      fee: 0,
      description: 'No baggage fee'
    }
  }
  
  const numericWeight = Number(weight)
  const { FREE_ALLOWANCE, STANDARD_RATE, HEAVY_RATE, EXTRA_HEAVY_RATE } = BAGGAGE_FEE_STRUCTURE
  
  if (numericWeight <= FREE_ALLOWANCE) {
    return {
      freeAllowance: FREE_ALLOWANCE,
      chargeableWeight: 0,
      rate: 0,
      fee: 0,
      description: `Within free allowance (${numericWeight}/${FREE_ALLOWANCE}kg)`
    }
  }
  
  if (numericWeight <= 25) {
    const chargeableWeight = numericWeight - FREE_ALLOWANCE
    const fee = chargeableWeight * STANDARD_RATE
    return {
      freeAllowance: FREE_ALLOWANCE,
      chargeableWeight,
      rate: STANDARD_RATE,
      fee,
      description: `Standard rate: ${chargeableWeight}kg × ${STANDARD_RATE} ETB`
    }
  }
  
  if (numericWeight <= 35) {
    const standardWeight = 25 - FREE_ALLOWANCE
    const heavyWeight = numericWeight - 25
    const fee = (standardWeight * STANDARD_RATE) + (heavyWeight * HEAVY_RATE)
    return {
      freeAllowance: FREE_ALLOWANCE,
      chargeableWeight: numericWeight - FREE_ALLOWANCE,
      rate: `${STANDARD_RATE}/${HEAVY_RATE} ETB`,
      fee,
      description: `Mixed rate: ${standardWeight}kg × ${STANDARD_RATE} ETB + ${heavyWeight}kg × ${HEAVY_RATE} ETB`
    }
  }
  
  if (numericWeight <= BAGGAGE_FEE_STRUCTURE.MAX_WEIGHT) {
    const standardWeight = 25 - FREE_ALLOWANCE
    const heavyWeight = 10
    const extraHeavyWeight = numericWeight - 35
    const fee = (standardWeight * STANDARD_RATE) + (heavyWeight * HEAVY_RATE) + (extraHeavyWeight * EXTRA_HEAVY_RATE)
    return {
      freeAllowance: FREE_ALLOWANCE,
      chargeableWeight: numericWeight - FREE_ALLOWANCE,
      rate: `${STANDARD_RATE}/${HEAVY_RATE}/${EXTRA_HEAVY_RATE} ETB`,
      fee,
      description: `Premium rate: ${standardWeight}kg × ${STANDARD_RATE} ETB + ${heavyWeight}kg × ${HEAVY_RATE} ETB + ${extraHeavyWeight}kg × ${EXTRA_HEAVY_RATE} ETB`
    }
  }
  
  return {
    freeAllowance: FREE_ALLOWANCE,
    chargeableWeight: 0,
    rate: 0,
    fee: 0,
    description: `Exceeds maximum weight limit of ${BAGGAGE_FEE_STRUCTURE.MAX_WEIGHT}kg`
  }
}

// Status and validation functions
export const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    confirmed: 'bg-green-100 text-green-800 border-green-200',
    checked_in: 'bg-blue-100 text-blue-800 border-blue-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    completed: 'bg-gray-100 text-gray-800 border-gray-200',
    scheduled: 'bg-purple-100 text-purple-800 border-purple-200',
    departed: 'bg-orange-100 text-orange-800 border-orange-200',
    arrived: 'bg-green-100 text-green-800 border-green-200'
  }
  
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
}

export const generatePNR = () => {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 5)
  return `ETB${timestamp}${random}`.toUpperCase()
}

export const validatePhone = (phone) => {
  const ethiopianPhoneRegex = /^(\+251|0)(9\d{8})$/
  return ethiopianPhoneRegex.test(phone) || 'Please enter a valid Ethiopian phone number'
}

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) || 'Please enter a valid email address'
}

// Utility functions
export const capitalizeFirst = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export const isFutureDate = (date) => {
  if (!date) return false
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return dateObj > new Date()
  } catch (error) {
    console.error('Date comparison error:', error)
    return false
  }
}

// Simple date formatting for AdminBookings (without date-fns dependency)
export const formatSimpleDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid Date'
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export const formatSimpleDateTime = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid Date'
  
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const getTimeAgo = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}